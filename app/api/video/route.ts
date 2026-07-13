import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { renderVideo } from "@/lib/render";
import { createJob, updateJob } from "@/lib/jobs";
import type { VideoScript } from "@/lib/types";
import { checkCanGenerate, consumeEntitlement } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/video
 * Body: JSON { script: VideoScript }
 * Returns: { jobId } immediately. Poll /api/status?jobId=... for progress.
 *
 * Enforces free-video / credit entitlements before kicking off a render.
 */
export async function POST(req: NextRequest) {
  try {
    const entitlement = await checkCanGenerate();
    if (!entitlement.ok) {
      return NextResponse.json(
        {
          error: entitlement.message,
          code: entitlement.code,
          needsAuth: !entitlement.user,
        },
        { status: 402 }
      );
    }

    const { script } = (await req.json()) as { script?: VideoScript };
    if (!script || !Array.isArray(script.scenes) || script.scenes.length === 0) {
      return NextResponse.json({ error: "script required" }, { status: 400 });
    }

    // Consume free/credit immediately so refresh abuse can't double-spend.
    consumeEntitlement(entitlement);

    const jobId = randomUUID();
    createJob(jobId);
    updateJob(jobId, { status: "processing" });

    renderVideo(script, jobId)
      .then(({ videoUrl }) => {
        updateJob(jobId, { status: "done", videoUrl });
      })
      .catch((err: any) => {
        updateJob(jobId, {
          status: "error",
          error: err?.message ?? "render failed",
        });
      });

    return NextResponse.json({
      jobId,
      billedAs: entitlement.mode,
    });
  } catch (err: any) {
    console.error("[/api/video] error:", err);
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
