import { NextRequest, NextResponse } from "next/server";
import { extractPdfText, trimPaperText } from "@/lib/pdf";
import { generateScript } from "@/lib/script";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/script
 * Body: multipart/form-data with a "pdf" file field.
 * Returns: the structured VideoScript (title, hook, scenes, fullNarration).
 *
 * This is the "paper -> script" half of the pipeline. Kept separate from video
 * generation so you can preview / edit the script before spending an avatar
 * render credit.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("pdf");

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

    const trimmed = trimPaperText(rawText);
    const script = await generateScript(trimmed);

    return NextResponse.json({ script });
  } catch (err: any) {
    console.error("[/api/script] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Script generation failed" },
      { status: 500 }
    );
  }
}
