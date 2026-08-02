import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { getJob } from "@/lib/jobs";
import { getSessionUser } from "@/lib/auth";
import { isOperatorSession } from "@/lib/operator";
import { renderVideoPath } from "@/lib/renders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream a rendered MP4. Accessible only to the owning account or an operator.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  if (!jobId || jobId.includes("..") || jobId.includes("/")) {
    return NextResponse.json({ error: "invalid job" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  const user = await getSessionUser();
  const operator = await isOperatorSession();
  if (!operator && (!user || job.userId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = renderVideoPath(jobId);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  const stat = statSync(filePath);
  const size = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (!m) {
      return new NextResponse(null, { status: 416 });
    }
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : size - 1;
    if (start >= size || end >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="video.mp4"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Length": String(size),
      "Content-Type": "video/mp4",
      "Content-Disposition": `inline; filename="video.mp4"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
