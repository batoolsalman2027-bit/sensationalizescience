import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { listDoneJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/library
 * Returns completed renders (newest first) whose video file still exists on
 * disk, for the "My Library" tab.
 */
export async function GET() {
  const jobs = listDoneJobs().filter((j) => {
    if (!j.videoUrl) return false;
    const file = path.join(process.cwd(), "public", j.videoUrl.replace(/^\//, ""));
    return existsSync(file);
  });

  const videos = jobs.map((j) => ({
    id: j.id,
    videoUrl: j.videoUrl!,
    createdAt: j.createdAt,
  }));

  return NextResponse.json({ videos });
}
