import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/operator";
import { deliverVideoToLibrary } from "@/lib/deliver-library";
import { getVideoRequest } from "@/lib/video-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

/**
 * POST /api/video-requests/[id]/deliver
 * Operator uploads the finished MP4; it appears only in the requester's library.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const existing = getVideoRequest(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!existing.userId) {
    return NextResponse.json(
      {
        error:
          "This request isn’t linked to an account. Ask the submitter to sign in and resubmit.",
      },
      { status: 400 }
    );
  }

  try {
    const form = await req.formData();
    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0) {
      return NextResponse.json({ error: "Upload an MP4 video file" }, { status: 400 });
    }
    if (video.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video must be under 500 MB" }, { status: 400 });
    }
    const title = String(form.get("title") ?? "").trim();

    const result = deliverVideoToLibrary(
      params.id,
      Buffer.from(await video.arrayBuffer()),
      title || undefined
    );

    return NextResponse.json({
      request: result.request,
      jobId: result.jobId,
      videoUrl: result.videoUrl,
      message: "Video delivered to the requester’s private library",
    });
  } catch (err) {
    console.error("[deliver]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delivery failed" },
      { status: 500 }
    );
  }
}
