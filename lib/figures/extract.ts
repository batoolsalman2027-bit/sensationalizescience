/**
 * Figure extraction by caption anchoring.
 *
 * Journal layouts are wildly inconsistent, but one convention holds almost
 * everywhere: a figure's caption starts with "Figure N" / "Fig. N" and sits
 * directly below (occasionally above) the artwork. So rather than trying to
 * segment artwork visually, we find caption lines by their text, then claim
 * the vertical band of whitespace-free page between that caption and the
 * previous body-text block as the figure region.
 *
 * This captures vector artwork, which the embedded-raster extractor in
 * lib/pdf-figures.ts cannot see at all.
 */

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { figureAssetRoot } from "./paths";
import type { ExtractedFigure, FigureBounds } from "./types";
import {
  detectColumns,
  groupIntoLines,
  itemsInColumn,
  PdfSession,
  type PageLayout,
} from "./pdf-layout";

/**
 * PDF text extraction emits ligature glyphs as detached runs, so "identification"
 * arrives as "identi fi cation". Rejoin them before the text is stored as
 * provenance or shown to a reviewer.
 */
function normalizeLigatures(text: string): string {
  return text
    .replace(/(\p{L})\s(ffi|ffl|fi|fl|ff)\s(\p{L})/gu, "$1$2$3")
    .replace(/(\p{L})\s(ffi|ffl|fi|fl|ff)\b/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

const CAPTION_RE =/^(?:Figure|Fig\.?|FIGURE|FIG\.?)\s*([0-9]+[A-Za-z]?)\b\s*[.:\-–—|]?\s*(.*)$/;

/** Minimum region size, in points, for something to be a real figure. */
const MIN_REGION_WIDTH = 90;
const MIN_REGION_HEIGHT = 70;
/** Cap so one bad detection can't claim an entire page of body text. */
const MAX_REGION_HEIGHT_RATIO = 0.82;
const MAX_FIGURES = 14;
/** Rasterization scale — 2x keeps axis ticks legible for the vision pass. */
const RENDER_SCALE = 2;

export { figureAssetRoot };

interface CaptionHit {
  page: number;
  figureNumber: string;
  caption: string;
  /** y of the caption's first line (PDF space, from page bottom). */
  y: number;
  x: number;
  /** y of the lowest line belonging to the caption. */
  bottomY: number;
}

/**
 * Find caption blocks. A caption runs from its "Figure N" line down through
 * following lines until a blank gap or the next caption.
 *
 * Runs per column: on a two-column page, lines must be assembled within one
 * column or the neighbouring column's text is spliced into the caption.
 */
function findCaptions(layout: PageLayout): CaptionHit[] {
  return detectColumns(layout).flatMap((column) =>
    findCaptionsInLines(groupIntoLines(itemsInColumn(layout.items, column))).map(
      (hit) => ({ ...hit, page: layout.page })
    )
  );
}

function findCaptionsInLines(
  lines: { y: number; x: number; text: string }[]
): Omit<CaptionHit, "page">[] {
  const hits: Omit<CaptionHit, "page">[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].text.match(CAPTION_RE);
    if (!match) continue;

    const figureNumber = match[1];
    const parts = [match[2]].filter(Boolean);
    let bottomY = lines[i].y;

    // Absorb continuation lines: same left edge, no large vertical gap, and
    // not the start of another caption.
    for (let j = i + 1; j < lines.length; j++) {
      const gap = bottomY - lines[j].y;
      if (gap > 22) break;
      if (CAPTION_RE.test(lines[j].text)) break;
      if (Math.abs(lines[j].x - lines[i].x) > 42) break;
      parts.push(lines[j].text);
      bottomY = lines[j].y;
      if (parts.join(" ").length > 700) break;
    }

    hits.push({
      figureNumber,
      caption: normalizeLigatures(
        `Figure ${figureNumber}. ${parts.join(" ")}`
      ).slice(0, 900),
      y: lines[i].y,
      x: lines[i].x,
      bottomY,
    });
  }

  return hits;
}

/**
 * Claim the band above a caption, stopping at the nearest text line that sits
 * clearly above it — that line is body text or a column heading, not artwork.
 */
function regionForCaption(layout: PageLayout, caption: CaptionHit): FigureBounds | null {
  const lines = groupIntoLines(layout.items);

  // Text lines above the caption, nearest first.
  const above = lines
    .filter((l) => l.y > caption.y + 4)
    .sort((a, b) => a.y - b.y);

  // Walk upward while lines are sparse (axis tick labels, panel letters, and
  // in-figure annotations are short); stop at the first dense line, which
  // indicates prose.
  let top = layout.height;
  for (const line of above) {
    const isProse = line.text.length > 60;
    if (isProse) {
      top = line.y;
      break;
    }
  }

  const bottom = caption.y + 10; // just above the caption's baseline
  let height = top - bottom;
  if (height > layout.height * MAX_REGION_HEIGHT_RATIO) {
    height = layout.height * MAX_REGION_HEIGHT_RATIO;
    top = bottom + height;
  }
  if (height < MIN_REGION_HEIGHT) return null;

  // Horizontal extent: full page width minus margins. Narrowing to the
  // caption's column would clip wide multi-panel figures, and a little
  // surrounding whitespace is harmless for the vision pass.
  const margin = Math.min(36, layout.width * 0.06);
  const x = margin;
  const width = layout.width - margin * 2;
  if (width < MIN_REGION_WIDTH) return null;

  return { page: layout.page, x, y: bottom, width, height };
}

/**
 * Body text surrounding in-text references like "(Fig. 2)" or "Figure 2 shows".
 *
 * Text extracted from a figure-heavy page is littered with axis ticks and
 * panel letters ("0 4 8 12 16 Days p ns"), which trivially satisfy a
 * sentence-shaped regex. `readsAsProse` filters those out so the context we
 * store as provenance is actually readable sentences.
 */
function findReferenceContext(paperText: string, figureNumber: string): string {
  if (!paperText) return "";
  const re = new RegExp(
    `[^.]*\\b(?:Fig\\.?|Figure)\\s*${figureNumber}\\b[^.]*\\.`,
    "gi"
  );
  const matches = paperText.match(re) ?? [];
  return matches
    .map(normalizeLigatures)
    .filter((m) => m.length > 40 && m.length < 600)
    .filter(readsAsProse)
    .slice(0, 4)
    .join(" ")
    .slice(0, 1200);
}

/**
 * True when a string looks like a sentence rather than scattered chart labels.
 * Prose has mostly multi-letter words and few bare numbers.
 */
function readsAsProse(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 8) return false;
  const wordy = words.filter((w) => /^[A-Za-z][A-Za-z-]{2,}$/.test(w)).length;
  const numeric = words.filter((w) => /^[\d.,%-]+$/.test(w)).length;
  return wordy / words.length > 0.55 && numeric / words.length < 0.25;
}

/** Best-effort section heading that precedes a figure's first in-text mention. */
function findSection(paperText: string, figureNumber: string): string | null {
  if (!paperText) return null;
  const mention = paperText.search(
    new RegExp(`\\b(?:Fig\\.?|Figure)\\s*${figureNumber}\\b`, "i")
  );
  if (mention < 0) return null;

  const before = paperText.slice(0, mention);
  const headings = [
    "Introduction",
    "Background",
    "Methods",
    "Materials and Methods",
    "Results",
    "Discussion",
    "Conclusion",
    "Conclusions",
  ];
  let best: { name: string; at: number } | null = null;
  for (const heading of headings) {
    const at = before.toLowerCase().lastIndexOf(heading.toLowerCase());
    if (at >= 0 && (!best || at > best.at)) best = { name: heading, at };
  }
  return best?.name ?? null;
}

/**
 * Extract figures from a PDF: locate captions, claim their artwork regions,
 * rasterize each region, and bind caption + section + reference context.
 *
 * Returns [] on failure so callers can fall back rather than hard-failing the
 * whole upload.
 */
export async function extractFigures(
  pdfBuffer: Buffer,
  projectId: string,
  paperText = ""
): Promise<ExtractedFigure[]> {
  const outDir = figureAssetRoot(projectId);
  let session: PdfSession | null = null;

  try {
    await mkdir(outDir, { recursive: true });
    session = await PdfSession.open(pdfBuffer);
    const layouts = await session.readLayouts();

    const candidates: { caption: CaptionHit; bounds: FigureBounds }[] = [];
    for (const layout of layouts) {
      for (const caption of findCaptions(layout)) {
        const bounds = regionForCaption(layout, caption);
        if (bounds) candidates.push({ caption, bounds });
      }
    }

    // One region per figure number: journals repeat "Figure 2" in running
    // headers and cross-references, and the largest region is the real one.
    const byNumber = new Map<string, { caption: CaptionHit; bounds: FigureBounds }>();
    for (const candidate of candidates) {
      const key = candidate.caption.figureNumber;
      const existing = byNumber.get(key);
      const area = candidate.bounds.width * candidate.bounds.height;
      if (!existing || area > existing.bounds.width * existing.bounds.height) {
        byNumber.set(key, candidate);
      }
    }

    const ordered = [...byNumber.values()]
      .sort(
        (a, b) =>
          a.bounds.page - b.bounds.page ||
          Number(a.caption.figureNumber.replace(/\D/g, "")) -
            Number(b.caption.figureNumber.replace(/\D/g, ""))
      )
      .slice(0, MAX_FIGURES);

    const figures: ExtractedFigure[] = [];
    for (const { caption, bounds } of ordered) {
      const id = `fig-${caption.figureNumber}`;
      const fileName = `${id}.png`;

      try {
        const rendered = await session.renderRegion(bounds, RENDER_SCALE);
        await writeFile(path.join(outDir, fileName), rendered.buffer);

        figures.push({
          id,
          projectId,
          figureNumber: caption.figureNumber,
          caption: caption.caption,
          section: findSection(paperText, caption.figureNumber),
          referenceContext: findReferenceContext(paperText, caption.figureNumber),
          bounds,
          assetPath: fileName,
          width: rendered.width,
          height: rendered.height,
        });
      } catch (err) {
        console.warn(`[figures] failed to render ${id}:`, err);
      }
    }

    return figures;
  } catch (err) {
    console.warn("[figures] extraction failed:", err);
    return [];
  } finally {
    await session?.close().catch(() => {});
  }
}

/** Stable id for a brand-new project's asset folder. */
export function newProjectId(): string {
  return randomUUID();
}
