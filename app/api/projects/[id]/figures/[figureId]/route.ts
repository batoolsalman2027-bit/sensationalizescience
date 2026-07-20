import { NextRequest, NextResponse } from "next/server";
import { getProject, setFigureDecision } from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";
import type { FigureDecision } from "@/lib/figures/types";

export const runtime = "nodejs";

const ALLOWED: FigureDecision[] = ["pending", "approved", "rejected", "replaced"];

/**
 * PATCH /api/projects/:id/figures/:figureId
 * Body: { decision: "approved" | "rejected" | "replaced" | "pending", note?: string }
 *
 * Records a reviewer's decision. Every call also writes an append-only audit
 * event, so the approval history survives later changes of mind.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; figureId: string } }
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const user = await getSessionUser();
  if (project.userId && project.userId !== user?.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json()) as { decision?: string; note?: string };
  const decision = body.decision as FigureDecision;
  if (!ALLOWED.includes(decision)) {
    return NextResponse.json(
      { error: `decision must be one of: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = setFigureDecision(
    params.id,
    params.figureId,
    decision,
    user?.email ?? "anonymous",
    body.note
  );
  if (!updated) {
    return NextResponse.json({ error: "Figure not found" }, { status: 404 });
  }

  return NextResponse.json({ figure: updated });
}
