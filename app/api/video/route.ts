import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { renderVideo } from "@/lib/render";
import { createJob, updateJob } from "@/lib/jobs";
import type { VideoScript } from "@/lib/types";
import { checkCanGenerate, consumeEntitlement } from "@/lib/billing";
import {
  sanitizeRenderOptions,
  type RenderOptions,
} from "@/config/render-options";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/video
 * Body: JSON { script: VideoScript, options?: { voiceId, aspectRatio } }
 * Returns: { jobId } immediately. Poll /api/status?jobId=... for progress.
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

    const body = (await req.json()) as {
      script?: VideoScript;
      options?: Partial<RenderOptions>;
    };
    const { script } = body;
    if (!script || !Array.isArray(script.scenes) || script.scenes.length === 0) {
      return NextResponse.json({ error: "script required" }, { status: 400 });
    }

    const options = sanitizeRenderOptions(body.options);

    // Consume free/credit immediately so refresh abuse can't double-spend.
    consumeEntitlement(entitlement);

    const jobId = randomUUID();
    createJob(jobId, { userId: entitlement.user?.id ?? null });
    updateJob(jobId, { status: "processing" });

    renderVideo(script, jobId, options)
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
      options,
    });
  } catch (err: any) {
    console.error("[/api/video] error:", err);
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
