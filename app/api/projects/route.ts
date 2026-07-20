import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractPdfText, trimPaperText } from "@/lib/pdf";
import { runFigurePipeline } from "@/lib/figures/pipeline";
import { createProject, listProjects, updateProject } from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/projects — projects belonging to the signed-in user.
 */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ projects: listProjects(user?.id ?? null) });
}

/**
 * POST /api/projects
 * Body: multipart/form-data with a "pdf" file field, optional "narrative".
 *
 * Creates a project, extracts and analyzes the paper's figures, and returns
 * the ranked candidate set. This runs synchronously: figure analysis is a
 * handful of model calls, not a video render. If it grows past the request
 * budget it should move behind the job queue rather than being backgrounded
 * with a floating promise.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const form = await req.formData();
    const file = form.get("pdf");
    const narrative = String(form.get("narrative") ?? "");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);

    if (!rawText || rawText.trim().length < 200) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text. Is this a scanned/image PDF? Those need OCR.",
        },
        { status: 422 }
      );
    }

    const projectId = randomUUID();
    createProject({
      id: projectId,
      userId: user?.id ?? null,
      sourceFileName: file.name,
    });

    try {
      const result = await runFigurePipeline({
        projectId,
        pdfBuffer: buffer,
        // Figure extraction wants the full text (in-text references to later
        // figures live past the trim point); the models get the trimmed copy.
        paperText: rawText,
        narrative,
        actor: user?.email ?? "anonymous",
      });

      if (narrative) updateProject(projectId, { narrative });

      return NextResponse.json({
        projectId,
        figures: result.figures,
        failedCount: result.failedCount,
        paperExcerpt: trimPaperText(rawText).slice(0, 400),
      });
    } catch (err: any) {
      updateProject(projectId, { status: "failed" });
      throw err;
    }
  } catch (err: any) {
    console.error("[/api/projects] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Project creation failed" },
      { status: 500 }
    );
  }
}
