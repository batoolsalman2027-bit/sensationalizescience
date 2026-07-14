import { NextResponse } from "next/server";
import { listDoneJobs } from "@/lib/jobs";
import { renderVideoExists, renderVideoUrl } from "@/lib/renders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/library
 * Returns completed renders (newest first) whose video file still exists on
 * disk, for the "My Library" tab.
 */
export async function GET() {
  const videos = listDoneJobs()
    .filter((j) => renderVideoExists(j.id))
    .map((j) => ({
      id: j.id,
      videoUrl: renderVideoUrl(j.id),
      createdAt: j.createdAt,
    }));

  return NextResponse.json({ videos });
}
