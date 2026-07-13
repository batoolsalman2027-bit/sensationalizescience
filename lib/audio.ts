import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import type { WordTiming } from "./tts";

const execFileP = promisify(execFile);

/**
 * Resolve the ffmpeg binary. Next/webpack can rewrite ffmpeg-static's exported
 * path to a non-existent .next/ location, so fall back to the real node_modules
 * binary when the imported path doesn't exist.
 */
function resolveFfmpeg(): string {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;
  const fallback = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );
  if (existsSync(fallback)) return fallback;
  throw new Error("ffmpeg-static binary not found");
}

/**
 * Speeds up an mp3 in place using ffmpeg's atempo (pitch-preserving), and
 * returns the word timings rescaled to the new, faster timeline so captions
 * stay in sync. ElevenLabs' own speed control caps at 1.2x, so anything beyond
 * that is done here. atempo accepts 0.5–2.0 in a single pass.
 */
export async function speedUpAudio(
  filePath: string,
  factor: number,
  words: WordTiming[]
): Promise<WordTiming[]> {
  if (factor === 1) return words;
  const ffmpeg = resolveFfmpeg();

  const tmp = filePath.replace(/\.mp3$/, ".tmp.mp3");
  await execFileP(ffmpeg, [
    "-y",
    "-i",
    filePath,
    "-filter:a",
    `atempo=${factor}`,
    tmp,
  ]);
  // Replace the original with the sped-up version.
  await execFileP("/bin/mv", ["-f", tmp, filePath]);

  return words.map((w) => ({
    word: w.word,
    start: w.start / factor,
    end: w.end / factor,
  }));
}
