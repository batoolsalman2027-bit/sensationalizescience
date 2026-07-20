import { NextResponse } from "next/server";
import {
  getProject,
  listFigures,
  listProvenance,
  listReviewEvents,
} from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/projects/:id — the project, its ranked figures, provenance records,
 * and full audit history.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Projects created while signed in are readable only by their owner.
  // Anonymous projects (userId null) stay reachable by id, matching how the
  // existing anonymous render flow works.
  const user = await getSessionUser();
  if (project.userId && project.userId !== user?.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project,
    figures: listFigures(params.id),
    provenance: listProvenance(params.id),
    events: listReviewEvents(params.id),
  });
}
