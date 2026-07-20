import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { figureAssetRoot } from "@/lib/figures/paths";
import { getProject } from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/projects/:id/assets/:file — serve an extracted figure crop.
 *
 * Figure assets live under data/, not public/, because they are unpublished
 * research: they must be access-checked rather than served statically to
 * anyone who can guess a URL.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; file: string } }
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getSessionUser();
  if (project.userId && project.userId !== user?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reject any path that isn't a plain PNG filename — no separators, no
  // traversal, no alternate extensions.
  if (!/^[A-Za-z0-9._-]+\.png$/.test(params.file) || params.file.includes("..")) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }

  const root = figureAssetRoot(params.id);
  const filePath = path.join(root, params.file);
  // Defence in depth: the resolved path must still sit inside the project root.
  if (!path.resolve(filePath).startsWith(path.resolve(root) + path.sep)) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
