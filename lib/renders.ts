import path from "node:path";
import { existsSync } from "node:fs";

/** On-disk directory for a finished job's assets. */
export function renderJobDir(jobId: string) {
  return path.join(process.cwd(), "public", "renders", jobId);
}

export function renderVideoPath(jobId: string) {
  return path.join(renderJobDir(jobId), "video.mp4");
}

/** Public URL that works in production (Next won't serve post-build public files). */
export function renderVideoUrl(jobId: string) {
  return `/api/renders/${jobId}/video.mp4`;
}

export function renderVideoExists(jobId: string) {
  return existsSync(renderVideoPath(jobId));
}

/** Extract job id from either legacy `/renders/...` or `/api/renders/...` URLs. */
export function jobIdFromVideoUrl(videoUrl: string): string | null {
  const m = videoUrl.match(/\/(?:api\/)?renders\/([^/]+)\//);
  return m?.[1] ?? null;
}
