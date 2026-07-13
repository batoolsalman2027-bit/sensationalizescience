import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

/**
 * GET /api/status?jobId=...
 * Reads the job store; the render function in lib/render.ts updates it
 * directly when a render finishes or errors, so this route is just a thin
 * read-through. The frontend calls this on an interval.
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
