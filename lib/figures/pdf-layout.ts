/**
 * Positional PDF access: text items with coordinates, and page rasterization.
 *
 * The older extractor (lib/pdf-figures.ts) reads embedded raster XObjects,
 * which misses vector artwork entirely — and in journal PDFs most line, bar,
 * and forest plots are vector. Rendering page regions to a bitmap captures
 * whatever is actually drawn, vector or raster, so quantitative charts become
 * visible to the pipeline for the first time.
 */

import {
  createCanvas,
  DOMMatrix,
  ImageData as CanvasImageData,
  Path2D as CanvasPath2D,
} from "@napi-rs/canvas";

/**
 * pdfjs's canvas backend reaches for these as globals — in a browser they come
 * free, in Node they don't exist and text rendering throws `InvalidArg` inside
 * paintChar. Installed once at module load, and only where missing so we never
 * clobber a real DOM.
 */
function installCanvasGlobals() {
  const g = globalThis as Record<string, unknown>;
  g.DOMMatrix ??= DOMMatrix;
  g.Path2D ??= CanvasPath2D;
  g.ImageData ??= CanvasImageData;
}
installCanvasGlobals();

/** One positioned run of text on a page, in PDF user-space points. */
export interface TextItem {
  text: string;
  x: number;
  /** Distance from the BOTTOM of the page, as PDF space defines it. */
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  page: number;
  width: number;
  height: number;
  items: TextItem[];
}

export interface RegionRequest {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_PAGES = 40;
/** Rasterization scale — 2x keeps axis ticks legible for the vision pass. */
const DEFAULT_SCALE = 2;

/**
 * One open PDF, reused across layout reads and every region render.
 *
 * Opening the document per call (the obvious shape) tears down pdfjs's worker
 * while page tasks are still queued, which produced a stream of "Worker task
 * was terminated" warnings and dropped renders.
 */
export class PdfSession {
  private constructor(private doc: any) {}

  static async open(pdfBuffer: Buffer): Promise<PdfSession> {
    // Lazy import keeps Next's bundler from packing the huge pdf.js worker.
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await getDocument({
      data: new Uint8Array(pdfBuffer),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    return new PdfSession(doc);
  }

  get pageCount(): number {
    return Math.min(this.doc.numPages, MAX_PAGES);
  }

  /**
   * Read every page's text with positions. Positions are what let us bind a
   * caption to the artwork sitting directly above it, instead of guessing by
   * array index the way the legacy extractor did.
   */
  async readLayouts(): Promise<PageLayout[]> {
    const pages: PageLayout[] = [];

    for (let pageNum = 1; pageNum <= this.pageCount; pageNum++) {
      const page = await this.doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items: TextItem[] = [];
      for (const raw of content.items) {
        const item = raw as {
          str?: string;
          transform?: number[];
          width?: number;
          height?: number;
        };
        const text = item.str ?? "";
        if (!text.trim() || !item.transform) continue;
        items.push({
          text,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
          height: item.height ?? 0,
        });
      }

      pages.push({ page: pageNum, width: viewport.width, height: viewport.height, items });
    }

    return pages;
  }

  /**
   * Render a rectangular region of a page to a PNG buffer.
   *
   * The region arrives in PDF user space with y measured from the page bottom;
   * canvas draws with y from the top, so the context is translated once here
   * rather than re-deriving coordinates at every call site.
   */
  async renderRegion(
    region: RegionRequest,
    scale = DEFAULT_SCALE
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    const page = await this.doc.getPage(region.page);
    const viewport = page.getViewport({ scale });

    const outWidth = Math.max(1, Math.round(region.width * scale));
    const outHeight = Math.max(1, Math.round(region.height * scale));
    const canvas = createCanvas(outWidth, outHeight);
    const context = canvas.getContext("2d");

    // White ground: PDFs assume paper, and a transparent PNG reads as black
    // once composited into a dark video frame.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outWidth, outHeight);

    // Shift the page so the requested region lands at the canvas origin.
    // viewport.height - (y + height) * scale converts PDF's bottom-left origin
    // into canvas's top-left origin.
    context.translate(
      -region.x * scale,
      -(viewport.height - (region.y + region.height) * scale)
    );

    await page.render({
      // @napi-rs/canvas's 2D context is API-compatible with what pdfjs drives,
      // but the two libraries' TypeScript definitions don't overlap.
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return { buffer: canvas.toBuffer("image/png"), width: outWidth, height: outHeight };
  }

  async close(): Promise<void> {
    await this.doc.destroy();
  }
}

/**
 * Detect the page's text columns.
 *
 * Two-column journal layouts are the default in this domain, and grouping
 * text into lines without accounting for them splices the left column's words
 * together with the right column's at the same height — which turned figure
 * captions into interleaved nonsense. We look for a vertical gutter that
 * almost no text crosses; if one exists, the page is two-column.
 */
export function detectColumns(layout: PageLayout): { start: number; end: number }[] {
  const single = [{ start: 0, end: layout.width }];
  if (layout.items.length < 40) return single;

  const mid = layout.width / 2;
  const gutter = layout.width * 0.04;
  const crossing = layout.items.filter(
    (i) => i.x < mid - gutter && i.x + i.width > mid + gutter
  ).length;
  const left = layout.items.filter((i) => i.x + i.width <= mid + gutter).length;
  const right = layout.items.filter((i) => i.x >= mid - gutter).length;

  // Both sides must be populated, and almost nothing may span the gutter.
  const balanced = left > layout.items.length * 0.25 && right > layout.items.length * 0.25;
  if (!balanced || crossing > layout.items.length * 0.06) return single;

  // Boundaries must not overlap: the gutter is a detection tolerance only.
  // Overlapping ranges put right-column text into both columns, which
  // reintroduces exactly the interleaving this is meant to prevent.
  return [
    { start: 0, end: mid },
    { start: mid, end: layout.width },
  ];
}

/** Items belonging to a column, by their left edge. */
export function itemsInColumn(
  items: TextItem[],
  column: { start: number; end: number }
): TextItem[] {
  return items.filter((i) => i.x >= column.start && i.x < column.end);
}

/** Group positioned text items into lines, ordered top-to-bottom. */
export function groupIntoLines(
  items: TextItem[],
  tolerance = 2
): { y: number; x: number; text: string; items: TextItem[] }[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; x: number; text: string; items: TextItem[] }[] = [];

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.x = Math.min(line.x, item.x);
    } else {
      lines.push({ y: item.y, x: item.x, text: "", items: [item] });
    }
  }

  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items
      .map((i) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return lines;
}
