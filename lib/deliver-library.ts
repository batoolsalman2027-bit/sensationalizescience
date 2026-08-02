import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createJob, updateJob } from "./jobs";
import { renderJobDir, renderVideoPath, renderVideoUrl } from "./renders";
import { attachLibraryJob, getVideoRequest, type VideoRequestRow } from "./video-requests";

/**
 * Operator delivers a finished MP4 into the requester's private library.
 */
export function deliverVideoToLibrary(
  requestId: string,
  videoBuffer: Buffer,
  title?: string
): { request: VideoRequestRow; jobId: string; videoUrl: string } {
  const request = getVideoRequest(requestId);
  if (!request) throw new Error("Request not found");
  if (!request.userId) {
    throw new Error("This request has no linked account — the submitter must be signed in");
  }
  if (videoBuffer.length === 0) throw new Error("Empty video file");

  const jobId = randomUUID();
  createJob(jobId, {
    userId: request.userId,
    title: title?.trim() || request.sourceFileName.replace(/\.pdf$/i, "") || "Research video",
  });

  const dir = renderJobDir(jobId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(renderVideoPath(jobId), videoBuffer);

  const videoUrl = renderVideoUrl(jobId);
  updateJob(jobId, { status: "done", videoUrl });
  const updated = attachLibraryJob(requestId, jobId);
  if (!updated) throw new Error("Could not update request");

  return { request: updated, jobId, videoUrl };
}
