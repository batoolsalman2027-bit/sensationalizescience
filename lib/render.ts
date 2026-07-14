import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { parseBuffer } from "music-metadata";
import { synthesizeWithTimestamps } from "./tts";
import { speedUpAudio } from "./audio";
import { generateSceneImage } from "./image";
import { renderVideoUrl } from "./renders";
import type { VideoScript } from "./types";

const FPS = 30;
/** Final narration speed multiplier (applied via ffmpeg, pitch-preserved). */
const NARRATION_SPEEDUP = Number(process.env.NARRATION_SPEED ?? "1.5");
/** Breathing room after each scene's narration ends before the next cuts in.
 *  Kept short to help hold the whole video under the 60s cap. */
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
  return `${prompt}\n\nThe image must literally depict these specific real elements from the paper (not generic substitutes): ${keyTerms.join(", ")}.`;
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

  // Two shots per scene (A + B) for a mid-scene hard-cut. Scene 1's shot A is the
  // style anchor generated first; all other shots reference it so the whole video
  // stays visually consistent. If image gen is unavailable, scenes fall back to
  // the code-drawn setting.
  const sceneImages: { a?: string; b?: string }[] = new Array(script.scenes.length);
  const [first, ...rest] = script.scenes;

  const firstA = await genImage(groundPrompt(first.imagePrompt, first.keyTerms), `scene-${first.index}-a.png`);
  const ref = firstA.base64;

  // Everything else generates in parallel against the anchor reference.
  const firstBPromise = genImage(groundPrompt(first.imagePromptB, first.keyTerms), `scene-${first.index}-b.png`, ref);
  const restPromises = rest.map(async (s) => ({
    index: s.index,
    a: await genImage(groundPrompt(s.imagePrompt, s.keyTerms), `scene-${s.index}-a.png`, ref),
    b: await genImage(groundPrompt(s.imagePromptB, s.keyTerms), `scene-${s.index}-b.png`, ref),
  }));

  const firstB = await firstBPromise;
  sceneImages[0] = { a: firstA.path, b: firstB.path };
  const restResolved = await Promise.all(restPromises);
  restResolved.forEach((r) => {
    sceneImages[r.index - 1] = { a: r.a.path, b: r.b.path };
  });

  const scenes = [];
  for (const scene of script.scenes) {
    const { buffer, words } = await synthesizeWithTimestamps(scene.narration);
    const fileName = `scene-${scene.index}.mp3`;
    const filePath = path.join(audioDir, fileName);
    await writeFile(filePath, buffer);
    // Speed up the narration (pitch-preserved) and rescale caption timings.
    const captions = await speedUpAudio(filePath, NARRATION_SPEEDUP, words);
    const durationInFrames = await mp3DurationInFrames(await readFile(filePath));
    scenes.push({
      index: scene.index,
      title: scene.title,
      narration: scene.narration,
      icon: scene.icon,
      subject: scene.subject,
      setting: scene.setting,
      imageStaticPath: sceneImages[scene.index - 1]?.a,
      imageStaticPathB: sceneImages[scene.index - 1]?.b,
      audioStaticPath: `audio/${fileName}`,
      captions,
      durationInFrames,
    });
  }

  const inputProps = {
    scenes,
    coldOpen: script.coldOpen,
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
