import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireOperator } from "@/lib/operator";
import {
  assertRequestAssetPath,
  getVideoRequest,
  updateVideoRequestStatus,
  type VideoRequestStatus,
} from "@/lib/video-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: VideoRequestStatus[] = ["new", "in_progress", "delivered", "archived"];

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const row = getVideoRequest(params.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = req.nextUrl.searchParams.get("asset");
  if (asset === "pdf" || asset === "logo") {
    const filePath = asset === "pdf" ? row.pdfPath : row.logoPath;
    if (!filePath) return NextResponse.json({ error: "Asset missing" }, { status: 404 });
    try {
      const safe = assertRequestAssetPath(filePath);
      if (!fs.existsSync(safe)) {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
      }
      const buf = fs.readFileSync(safe);
      const name =
        asset === "pdf"
          ? row.sourceFileName
          : row.logoFileName ?? path.basename(safe);
      const type =
        asset === "pdf"
          ? "application/pdf"
          : name.toLowerCase().endsWith(".svg")
          ? "image/svg+xml"
          : name.toLowerCase().endsWith(".png")
          ? "image/png"
          : name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
      return new NextResponse(buf, {
        headers: {
          "Content-Type": type,
          "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
    }
  }

  return NextResponse.json({ request: row });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status as string;
  if (!STATUSES.includes(status as VideoRequestStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = updateVideoRequestStatus(params.id, status as VideoRequestStatus);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: updated });
}
