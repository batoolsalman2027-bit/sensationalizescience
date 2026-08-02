import { NextRequest, NextResponse } from "next/server";
import { listDoneJobsForUser } from "@/lib/jobs";
import { getSessionUser } from "@/lib/auth";
import { renderVideoExists, renderVideoUrl } from "@/lib/renders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/library
 * Completed videos for the signed-in account only.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your library", videos: [] },
      { status: 401 }
    );
  }

  const videos = listDoneJobsForUser(user.id)
    .filter((j) => renderVideoExists(j.id))
    .map((j) => ({
      id: j.id,
      title: j.title || "Research video",
      videoUrl: renderVideoUrl(j.id),
      createdAt: j.createdAt,
    }));

  return NextResponse.json({ videos });
}
