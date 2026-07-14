import path from "node:path";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { parseBuffer } from "music-metadata";
import { synthesizeWithTimestamps } from "./tts";
import { speedUpAudio } from "./audio";
import { generateFigureRemake, generateSceneImage } from "./image";
import { renderVideoUrl } from "./renders";
import { figuresStagingRoot } from "./pdf-figures";
import type { FigurePlacement, VideoScript } from "./types";

const FPS = 30;
/** Final narration speed multiplier (applied via ffmpeg, pitch-preserved).
 *  Default 1.2 ≈ 20% slower than the previous 1.5× default. */
const NARRATION_SPEEDUP = Number(process.env.NARRATION_SPEED ?? "1.2");
/** Silent citation card at the start of every video. */
const TITLE_CARD_FRAMES = 60; // 2 seconds @ 30fps
/** Breathing room after each scene's narration ends before the next cuts in. */
const PADDING_FRAMES = 8;

async function mp3DurationInFrames(buffer: Buffer): Promise<number> {
  const metadata = await parseBuffer(buffer, "audio/mpeg");
  const seconds = metadata.format.duration ?? 3;
  return Math.round(seconds * FPS) + PADDING_FRAMES;
}

/**
 * Hard-appends the scene's paper-derived keyTerms as an explicit grounding
 * instruction, independent of whether Claude wove them into the prose prompt.
 * This is what keeps illustrations tied to the paper's real entities instead
 * of drifting into generic stock-art imagery.
 */
function groundPrompt(prompt: string, keyTerms: string[]): string {
  if (keyTerms.length === 0) return prompt;
  return `${prompt}\n\nThe image must literally depict these specific real elements from the paper (not generic substitutes): ${keyTerms.join(", ")}. Do not draw any text or letters.`;
}

type RenderScene = {
  index: number;
  title: string;
  narration: string;
  icon: string;
  keyTerms: string[];
  setting: string;
  imageStaticPath?: string;
  imageStaticPathB?: string;
  figureStaticPath?: string;
  figurePlacement?: FigurePlacement;
  figureCaption?: string;
  audioStaticPath: string;
  captions: Awaited<ReturnType<typeof speedUpAudio>>;
  durationInFrames: number;
};

/** Load staged PDF figures as Gemini references only (never shown in the final video). */
async function loadFigureSources(
  script: VideoScript
): Promise<Map<string, { base64: string; caption: string }>> {
  const map = new Map<string, { base64: string; caption: string }>();
  if (!script.figureAssetId || !script.figures?.length) return map;

  const srcRoot = figuresStagingRoot(script.figureAssetId);
  for (const fig of script.figures) {
    const src = path.join(srcRoot, fig.fileName);
    try {
      await access(src);
      const buf = await readFile(src);
      map.set(fig.id, {
        base64: buf.toString("base64"),
        caption: fig.caption,
      });
    } catch {
      console.warn(`[render] missing staged figure ${fig.id} at ${src}`);
    }
  }
  return map;
}

/**
 * Turns a VideoScript into a rendered motion-graphics mp4:
 * ElevenLabs narration per scene -> probe each clip's duration -> bundle the
 * Remotion composition -> render to public/renders/<jobId>/video.mp4.
 */
export async function renderVideo(
  script: VideoScript,
  jobId: string
): Promise<{ videoUrl: string }> {
  const renderDir = path.join(process.cwd(), "public", "renders", jobId);
  const audioDir = path.join(renderDir, "audio");
  const imagesDir = path.join(renderDir, "images");
  await mkdir(audioDir, { recursive: true });
  await mkdir(imagesDir, { recursive: true });

  const figureSources = await loadFigureSources(script);

  // Generate one illustration for a given prompt, style-chained off a reference.
  const genImage = async (
    prompt: string,
    fileName: string,
    ref?: string
  ): Promise<{ path?: string; base64?: string }> => {
    try {
      const img = await generateSceneImage(prompt, ref);
      await writeFile(path.join(imagesDir, fileName), img.buffer);
      return { path: `images/${fileName}`, base64: img.base64 };
    } catch (err) {
      console.warn(`[render] image generation failed for ${fileName}, using fallback:`, err);
      return { path: undefined, base64: undefined };
    }
  };

  const remakeFigure = async (
    figureId: string,
    fileStem: string,
    keyTerms: string[]
  ): Promise<{ path?: string; caption?: string }> => {
    const source = figureSources.get(figureId);
    if (!source) return {};
    try {
      const remake = await generateFigureRemake({
        sourceBase64: source.base64,
        caption: source.caption,
        keyTerms,
      });
      const fileName = `${fileStem}-figure-remake.png`;
      await writeFile(path.join(imagesDir, fileName), remake.buffer);
      return { path: `images/${fileName}`, caption: source.caption };
    } catch (err) {
      console.warn(`[render] figure remake failed for ${figureId}:`, err);
      return {};
    }
  };

  const buildSpokenBeat = async (opts: {
    index: number;
    title: string;
    narration: string;
    icon: string;
    keyTerms: string[];
    setting: string;
    imagePrompt: string;
    imagePromptB?: string;
    fileStem: string;
    styleRef?: string;
    figureId?: string | null;
    figurePlacement?: FigurePlacement;
  }): Promise<{ scene: RenderScene; styleRef?: string }> => {
    const placement = opts.figurePlacement ?? "inset";
    const remake = opts.figureId
      ? await remakeFigure(opts.figureId, opts.fileStem, opts.keyTerms)
      : {};
    // Full-bleed remakes can stand alone; insets keep an AI backdrop underneath.
    const skipBackdrop = Boolean(remake.path && placement === "fullbleed");

    let shotA: { path?: string; base64?: string } = { path: undefined };
    let shotB: { path?: string } = { path: undefined };
    let styleRef = opts.styleRef;

    if (!skipBackdrop) {
      const groundedA = groundPrompt(opts.imagePrompt, opts.keyTerms);
      shotA = await genImage(groundedA, `${opts.fileStem}-a.png`, opts.styleRef);
      styleRef = opts.styleRef ?? shotA.base64;
      shotB = opts.imagePromptB
        ? await genImage(
            groundPrompt(opts.imagePromptB, opts.keyTerms),
            `${opts.fileStem}-b.png`,
            styleRef
          )
        : { path: undefined };
    }

    const { buffer, words } = await synthesizeWithTimestamps(opts.narration);
    const fileName = `${opts.fileStem}.mp3`;
    const filePath = path.join(audioDir, fileName);
    await writeFile(filePath, buffer);
    const captions = await speedUpAudio(filePath, NARRATION_SPEEDUP, words);
    const durationInFrames = await mp3DurationInFrames(await readFile(filePath));

    return {
      styleRef,
      scene: {
        index: opts.index,
        title: opts.title,
        narration: opts.narration,
        icon: opts.icon,
        keyTerms: opts.keyTerms,
        setting: opts.setting,
        imageStaticPath: shotA.path,
        imageStaticPathB: shotB.path,
        figureStaticPath: remake.path,
        figurePlacement: remake.path ? placement : undefined,
        figureCaption: remake.caption,
        audioStaticPath: `audio/${fileName}`,
        captions,
        durationInFrames,
      },
    };
  };

  const scenes: RenderScene[] = [];
  let styleRef: string | undefined;

  // Lay-audience primer beat (spoken after the silent title card).
  if (script.background?.trim()) {
    const bg = await buildSpokenBeat({
      index: 0,
      title: "Context",
      narration: script.background.trim(),
      icon: "book-open",
      keyTerms: [],
      setting: "lecture-hall",
      imagePrompt: script.backgroundImagePrompt || script.scenes[0]?.imagePrompt || "",
      fileStem: "background",
    });
    styleRef = bg.styleRef;
    scenes.push(bg.scene);
  }

  // Fixed 4-act paper scenes. Style-chain off the primer (or first technical shot).
  for (const scene of script.scenes) {
    const built = await buildSpokenBeat({
      index: scene.index,
      title: scene.title,
      narration: scene.narration,
      icon: scene.icon,
      keyTerms: scene.keyTerms,
      setting: scene.setting,
      imagePrompt: scene.imagePrompt,
      imagePromptB: scene.imagePromptB,
      fileStem: `scene-${scene.index}`,
      styleRef,
      figureId: scene.figureId,
      figurePlacement: scene.figurePlacement,
    });
    if (!styleRef) styleRef = built.styleRef;
    scenes.push(built.scene);
  }

  const inputProps = {
    scenes,
    coldOpen: script.coldOpen,
    paperTitle: script.paperTitle,
    authors: script.authors,
    journal: script.journal,
    doi: script.doi,
    titleCardFrames: TITLE_CARD_FRAMES,
  };

  // The per-job audio dir doubles as the Remotion bundle's public dir, so
  // staticFile("audio/...") inside the composition resolves to the files
  // we just wrote above.
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "Root.tsx"),
    publicDir: renderDir,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Explainer",
    inputProps,
  });

  const outputLocation = path.join(renderDir, "video.mp4");

  // Railway (and similar small VMs) often SIGKILL FFmpeg when Remotion uses
  // default concurrency + 1080x1920 + parallel encode (OOM). Keep this lean.
  const renderScale = Number(process.env.RENDER_SCALE ?? "0.5"); // 540×960 by default
  const renderConcurrency = Number(process.env.RENDER_CONCURRENCY ?? "1");

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
    concurrency: renderConcurrency,
    scale: Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 0.5,
    // Encode after frames — lower peak RAM than parallel stitch+encode.
    disallowParallelEncoding: true,
    // Keep Remotion's frame cache tiny on small instances.
    offthreadVideoCacheSizeInBytes: 32 * 1024 * 1024,
    x264Preset: "veryfast",
    chromiumOptions: {
      // Multi-process Chrome uses much more RAM on Linux containers.
      enableMultiProcessOnLinux: false,
    },
    ffmpegOverride: ({ args }) => {
      // libx264 was spawning ~60 threads from host CPU count → OOM on Railway.
      const next = [...args];
      if (!next.includes("-threads")) {
        next.push("-threads", process.env.FFMPEG_THREADS ?? "2");
      }
      return next;
    },
  });

  return { videoUrl: renderVideoUrl(jobId) };
}
