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

/**
 * Reads an audio file's duration in seconds via ffmpeg.
 *
 * ffmpeg already ships with the app and is spawned for speedUpAudio, so this
 * adds no dependency. It replaces music-metadata for duration probing, which
 * intermittently failed with "Guessed MIME-type not supported" once Remotion
 * and ffmpeg were loaded into the same process — even on valid mp3s. `-f null -`
 * decodes the file and exits 0, printing "Duration: HH:MM:SS.ss" to stderr.
 */
export async function probeAudioDurationSeconds(filePath: string): Promise<number> {
  const ffmpeg = resolveFfmpeg();
  const { stderr } = await execFileP(ffmpeg, ["-i", filePath, "-f", "null", "-"]);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error("ffmpeg did not report a duration");
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]);
}
