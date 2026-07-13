import pdfParse from "pdf-parse";

/**
 * Extract plain text from a PDF buffer.
 *
 * NOTE: This works for text-based PDFs (the vast majority of journal articles).
 * Scanned / image-only PDFs will return little or no text — those need OCR
 * (e.g. Tesseract), which is intentionally out of scope for the MVP.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text || "";
}

/**
 * Trim a full paper down to the parts worth summarizing.
 *
 * Heuristic, not perfect: we cut everything from the References/Bibliography
 * heading onward, and cap total length so we don't send a giant payload to
 * Claude. For a *summary* video you rarely need the full text anyway.
 */
export function trimPaperText(raw: string, maxChars = 24000): string {
  let text = raw.replace(/\r/g, "").trim();

  // Drop references / acknowledgments tail if we can find a heading for it.
  const cutMarkers = [
    /\n\s*references\s*\n/i,
    /\n\s*bibliography\s*\n/i,
    /\n\s*acknowledg(e)?ments?\s*\n/i,
  ];
  for (const marker of cutMarkers) {
    const m = text.match(marker);
    if (m && m.index && m.index > text.length * 0.4) {
      // Only cut if the marker is in the back half — avoids false positives.
      text = text.slice(0, m.index);
      break;
    }
  }

  // Collapse excessive whitespace from multi-column extraction.
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");

  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + "\n\n[...truncated for length...]";
  }
  return text;
}
