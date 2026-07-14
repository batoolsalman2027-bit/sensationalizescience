import { NextRequest, NextResponse } from "next/server";
import { extractPdfText, trimPaperText } from "@/lib/pdf";
import { extractPdfFigures } from "@/lib/pdf-figures";
import { generateScript } from "@/lib/script";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/script
 * Body: multipart/form-data with a "pdf" file field.
 * Returns: the structured VideoScript (title, hook, scenes, figures, …).
 *
 * Extracts embedded paper figures while the PDF is in hand, so later video
 * renders can composite real figure insets without re-uploading the file.
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
    const { assetId, figures } = await extractPdfFigures(buffer, trimmed);
    const script = await generateScript(trimmed, figures, assetId);

    return NextResponse.json({ script });
  } catch (err: any) {
    console.error("[/api/script] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Script generation failed" },
      { status: 500 }
    );
  }
}
