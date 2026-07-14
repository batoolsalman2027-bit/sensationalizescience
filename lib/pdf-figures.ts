import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { PaperFigure } from "./types";

const MIN_EDGE = 180;
const MIN_AREA = 80_000;
const MAX_FIGURES = 10;
const MAX_LONG_EDGE = 1600;

/** Staging root under the Railway renders volume when symlinked. */
export function figuresStagingRoot(assetId: string) {
  return path.join(process.cwd(), "public", "renders", "_figures", assetId);
}

type RawImage = {
  page: number;
  width: number;
  height: number;
  /** RGBA or RGB packed bytes from pdf.js */
  data: Uint8Array | Uint8ClampedArray;
  kind: number;
};

/**
 * Pull figure-ish raster images embedded in a PDF and write PNGs to disk.
 * Uses pdfjs-dist (no native poppler). Skips tiny decorations/logos.
 * Returns [] on any failure so the rest of the pipeline can fall back to AI art.
 */
export async function extractPdfFigures(
  pdfBuffer: Buffer,
  paperText = ""
): Promise<{ assetId: string; figures: PaperFigure[] }> {
  const assetId = randomUUID();
  const outDir = figuresStagingRoot(assetId);

  try {
    await mkdir(outDir, { recursive: true });
    const raw = await collectEmbeddedImages(pdfBuffer);
    const captions = extractFigureCaptions(paperText);

    // Prefer large images; dedupe near-identical sizes on the same page.
    const ranked = raw
      .filter((img) => img.width >= MIN_EDGE && img.height >= MIN_EDGE)
      .filter((img) => img.width * img.height >= MIN_AREA)
      .sort((a, b) => b.width * b.height - a.width * a.height);

    const picked: RawImage[] = [];
    for (const img of ranked) {
      if (picked.length >= MAX_FIGURES) break;
      const dup = picked.some(
        (p) =>
          p.page === img.page &&
          Math.abs(p.width - img.width) < 8 &&
          Math.abs(p.height - img.height) < 8
      );
      if (dup) continue;
      // Skip ultra-wide decorative rules / banners.
      const ratio = img.width / img.height;
      if (ratio > 8 || ratio < 0.12) continue;
      picked.push(img);
    }

    // Keep reading order roughly by page then size.
    picked.sort((a, b) => a.page - b.page || b.width * b.height - a.width * a.height);

    const figures: PaperFigure[] = [];
    for (let i = 0; i < picked.length; i++) {
      const img = picked[i];
      const id = `fig-${i + 1}`;
      const fileName = `${id}.png`;
      const outPath = path.join(outDir, fileName);

      try {
        await encodeFigurePng(img, outPath);
      } catch (err) {
        console.warn(`[pdf-figures] skip ${id}:`, err);
        continue;
      }

      const meta = await sharp(outPath).metadata();
      const caption =
        captions[i]?.caption ??
        captions.find((c) => c.pageHint === img.page)?.caption ??
        `Image from page ${img.page}`;

      figures.push({
        id,
        fileName,
        page: img.page,
        width: meta.width ?? img.width,
        height: meta.height ?? img.height,
        caption: caption.slice(0, 240),
      });
    }

    return { assetId, figures };
  } catch (err) {
    console.warn("[pdf-figures] extraction failed:", err);
    return { assetId, figures: [] };
  }
}

async function collectEmbeddedImages(pdfBuffer: Buffer): Promise<RawImage[]> {
  // Dynamic import keeps Next's bundler from trying to pack the huge pdf.js worker.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { getDocument, OPS } = pdfjs;

  const doc = await getDocument({
    data: new Uint8Array(pdfBuffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const images: RawImage[] = [];
  const maxPages = Math.min(doc.numPages, 40);

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();
    const seen = new Set<string>();

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn !== OPS.paintImageXObject &&
        fn !== OPS.paintImageXObjectRepeat &&
        fn !== OPS.paintInlineImageXObject
      ) {
        continue;
      }
      const name = ops.argsArray[i]?.[0];
      if (typeof name !== "string" || seen.has(name)) continue;
      seen.add(name);

      const img = await resolveImageObj(page, name);
      if (!img) continue;
      images.push({
        page: pageNum,
        width: img.width,
        height: img.height,
        data: img.data,
        kind: img.kind ?? 3,
      });
    }
  }

  await doc.destroy();
  return images;
}

async function resolveImageObj(
  page: { objs: { get: Function }; commonObjs: { get: Function } },
  name: string
): Promise<{ width: number; height: number; data: Uint8Array | Uint8ClampedArray; kind?: number } | null> {
  const tryGet = (store: { get: Function }) =>
    new Promise<any>((resolve) => {
      try {
        const immediate = store.get(name, (v: unknown) => resolve(v));
        // Some pdfjs builds return synchronously when already resolved.
        if (immediate && immediate.data) resolve(immediate);
      } catch {
        resolve(null);
      }
      // Timeout so a missing obj can't hang the request.
      setTimeout(() => resolve(null), 1500);
    });

  const fromPage = await tryGet(page.objs);
  const raw = fromPage ?? (await tryGet(page.commonObjs));
  if (!raw || !raw.data || !raw.width || !raw.height) return null;

  // Already a decoded bitmap.
  if (raw.data instanceof Uint8Array || raw.data instanceof Uint8ClampedArray) {
    return {
      width: raw.width,
      height: raw.height,
      data: raw.data,
      kind: raw.kind,
    };
  }
  return null;
}

/** Pull "Figure N. ..." lines from paper text for caption hints. */
function extractFigureCaptions(
  paperText: string
): { number: string; caption: string; pageHint?: number }[] {
  if (!paperText) return [];
  const out: { number: string; caption: string; pageHint?: number }[] = [];
  const re =
    /(?:Figure|Fig\.?)\s*(\d+[A-Za-z]?)\s*[.:\-–—]\s*([^\n]{12,280})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paperText)) !== null) {
    out.push({
      number: m[1],
      caption: `Fig. ${m[1]}. ${m[2].replace(/\s+/g, " ").trim()}`,
    });
  }
  return out;
}

/** Human-readable catalog for Claude (no binary). */
export function formatFigureCatalog(figures: PaperFigure[]): string {
  if (figures.length === 0) return "(no embedded figures found in this PDF)";
  return figures
    .map(
      (f) =>
        `- ${f.id}: page ${f.page}, ${f.width}×${f.height}px — ${f.caption}`
    )
    .join("\n");
}

async function encodeFigurePng(img: RawImage, outPath: string) {
  const buf = Buffer.from(img.data);
  // Some embeds are still JPEG streams.
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let pipeline = sharp(buf);
    const meta = await pipeline.metadata();
    const w = meta.width ?? img.width;
    const h = meta.height ?? img.height;
    if (Math.max(w, h) > MAX_LONG_EDGE) {
      pipeline = pipeline.resize({
        width: w >= h ? MAX_LONG_EDGE : undefined,
        height: h > w ? MAX_LONG_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    await pipeline.png({ compressionLevel: 8 }).toFile(outPath);
    return;
  }

  // ImageKind: 1=GRAYSCALE_1BPP (skip), 2=RGB_24BPP, 3=RGBA_32BPP
  if (img.kind === 1) {
    throw new Error("unsupported 1bpp mask");
  }
  const channels = img.kind === 2 ? 3 : 4;
  const need = img.width * img.height * channels;
  if (buf.length < need) {
    throw new Error(`pixel buffer too small (${buf.length} < ${need})`);
  }

  let pipeline = sharp(buf.subarray(0, need), {
    raw: { width: img.width, height: img.height, channels: channels as 3 | 4 },
  });
  if (Math.max(img.width, img.height) > MAX_LONG_EDGE) {
    pipeline = pipeline.resize({
      width: img.width >= img.height ? MAX_LONG_EDGE : undefined,
      height: img.height > img.width ? MAX_LONG_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  await pipeline.png({ compressionLevel: 8 }).toFile(outPath);
}
