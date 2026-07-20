/**
 * Figure analysis: what does this figure show, and can its numbers be recovered?
 *
 * Runs one vision call per figure over the rendered crop plus its caption and
 * in-text discussion. Two outputs come back together because they need the
 * same context: a classification of the graphic, and an attempt at recovering
 * the underlying data.
 *
 * The data half is deliberately conservative. The model may only report values
 * it can quote from the caption, a table, or the body text — never values read
 * off the plotted marks. Estimating a bar's height from pixels produces
 * numbers that look authoritative and aren't, and this product's whole claim
 * is scientific accuracy.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { figureAssetRoot } from "./paths";
import type {
  ExtractedFigure,
  FigureAnalysis,
  FigureData,
  FigureKind,
} from "./types";

const MODEL = process.env.FIGURE_ANALYSIS_MODEL ?? "claude-sonnet-4-5-20250929";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_KINDS: FigureKind[] = [
  "chart",
  "micrograph",
  "blot",
  "schematic",
  "photo",
  "map",
  "table",
  "equation",
  "unknown",
];

const SYSTEM_PROMPT = `You analyze figures from scientific papers so they can be turned into accurate short-form video visuals.

You receive one figure image, its caption, and the surrounding discussion from the paper.

Return TWO things.

1. ANALYSIS — what the figure is and what it demonstrates:
   - "kind": exactly one of ${VALID_KINDS.join(", ")}.
     Use "chart" for any quantitative plot (bar, line, scatter, box, violin, survival, forest).
     Use "schematic" for labelled diagrams of a mechanism, device, protocol, or workflow.
     Use "micrograph" for microscopy and imaging data, "blot" for gels and westerns.
   - "summary": one sentence stating what the figure shows.
   - "resultDirection": the direction of the result in plain words, e.g.
     "responsive spines survive longer than unresponsive ones at every timepoint".
     If the figure shows no result (a pure schematic), use "".
   - "labels": axis titles, panel labels, and legend entries you can actually read.
   - "units": units you can actually read, e.g. ["days", "%", "μm³"]. Empty if none.
   - "panelCount": number of distinct panels.
   - "textDependent": true when the figure's meaning depends on text too small or
     too dense to survive in a short video.

2. DATA — recover THE QUANTITY THE FIGURE PLOTS ON ITS AXES.

   There are two acceptable ways to recover it, and you MUST label which you used.

   (a) QUOTED — the values are written in the caption, the body text, a table,
       or printed on the figure itself. Set "source": "paper_text".
       Put the verbatim sentence(s) the numbers came from in "evidence".

   (b) ESTIMATED — the values are not written anywhere, so you read them off the
       plotted marks: bar heights, point positions, curve levels against the axis
       ticks. Set "source": "vision_estimated".
       Describe in "evidence" what you read and from which panel, e.g.
       "read from panel b; y-axis 0-1 in 0.25 steps; four timepoints".
       Give "estimateConfidence" between 0 and 1 reflecting how legible the marks
       and axis ticks actually were.

   NEVER mix the two in one figure. If some values are printed and others must be
   read off the plot, treat the whole series as ESTIMATED.

   These rules apply to BOTH modes:
   - The series must be the SAME quantity the figure's y-axis measures. Statistics
     ABOUT the figure are NOT its data. These are never valid series:
       * p-values or significance levels
       * sample sizes (N = ...), counts of animals, cells, or replicates
       * correlation coefficients, test statistics, confidence intervals alone
     A caption reporting "P = 0.0001" tells you the result is significant. It does
     NOT tell you what the plotted bars measure. Never return these as data.
   - Preserve the DIRECTION and RELATIVE MAGNITUDES faithfully. An estimate that
     reverses which group is higher, or flattens a clear difference, is worse than
     no estimate at all.
   - Read the axis range and tick spacing before estimating any value, and keep
     every estimate inside the axis range.
   - If the marks are too dense, overlapping, or small to read honestly — or the
     axis has no legible scale — return "data": null. A refusal is always
     acceptable. A confident-looking wrong number is not.
   - Every series needs axis labels AND real units. If units are unknown, return null.

Output ONLY valid JSON (no markdown fences, no commentary) in EXACTLY this shape:
{
  "analysis": {
    "kind": string,
    "summary": string,
    "resultDirection": string,
    "labels": string[],
    "units": string[],
    "panelCount": number,
    "textDependent": boolean
  },
  "data": null | {
    "source": "paper_text" | "vision_estimated",
    "estimateConfidence": number | null,
    "chartType": "bar" | "line" | "scatter" | "box" | "survival",
    "evidence": string,
    "series": [
      {
        "label": string,
        "xLabel": string, "yLabel": string,
        "xUnit": string, "yUnit": string,
        "points": [{ "x": number | string, "y": number }],
        "error": [{ "y": number }] | null
      }
    ]
  }
}`;

/**
 * Extract the first balanced JSON object from a model response.
 *
 * Stripping fences isn't enough: models intermittently append commentary after
 * the closing brace, which made an otherwise-good analysis fail outright. This
 * scans for the first complete object instead, ignoring braces inside strings.
 */
export function parseFirstJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in response");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }

  throw new Error("unterminated JSON object in response");
}

function coerceAnalysis(raw: any): FigureAnalysis {
  const kind: FigureKind = VALID_KINDS.includes(raw?.kind) ? raw.kind : "unknown";
  return {
    kind,
    summary: String(raw?.summary ?? "").slice(0, 500),
    resultDirection: String(raw?.resultDirection ?? "").slice(0, 500),
    labels: Array.isArray(raw?.labels) ? raw.labels.map(String).slice(0, 40) : [],
    units: Array.isArray(raw?.units) ? raw.units.map(String).slice(0, 20) : [],
    panelCount: Number.isFinite(raw?.panelCount) ? Math.max(1, Math.round(raw.panelCount)) : 1,
    textDependent: Boolean(raw?.textDependent),
  };
}

/**
 * Quantities that describe a result rather than being the plotted result.
 * A model asked for "the figure's data" reaches for these constantly, because
 * they are the numbers papers actually write down — but charting a figure's
 * p-values as if they were its data would be badly misleading.
 */
const STATISTIC_LABEL_RE =
  /\b(p[\s-]?values?|significance|n\s*=|sample size|count|number of (?:mice|animals|cells|spines|replicates|subjects)|correlation|r\s*=|confidence interval|ci|test statistic|degrees of freedom)\b|^p$|^n$/i;

/**
 * Validate recovered data. Anything incomplete or off-axis becomes null rather
 * than a partially-trustworthy series — a chart is either faithful or it isn't
 * built at all.
 *
 * `analysis` is used to check that the recovered series actually corresponds to
 * an axis read off the figure. Without that check the model happily returns
 * numbers it found nearby (p-values, sample sizes) that have nothing to do with
 * what the figure plots.
 */
function coerceData(raw: any, analysis: FigureAnalysis): FigureData | null {
  if (!raw || typeof raw !== "object") return null;

  const series = Array.isArray(raw.series) ? raw.series : [];
  const clean = series
    .map((s: any) => ({
      label: String(s?.label ?? ""),
      xLabel: String(s?.xLabel ?? ""),
      yLabel: String(s?.yLabel ?? ""),
      xUnit: String(s?.xUnit ?? ""),
      yUnit: String(s?.yUnit ?? ""),
      points: Array.isArray(s?.points)
        ? s.points
            .filter((p: any) => Number.isFinite(Number(p?.y)))
            .map((p: any) => ({
              x: typeof p.x === "number" ? p.x : String(p?.x ?? ""),
              y: Number(p.y),
            }))
        : [],
      error: Array.isArray(s?.error)
        ? s.error
            .filter((e: any) => Number.isFinite(Number(e?.y)))
            .map((e: any) => ({ y: Number(e.y) }))
        : undefined,
    }))
    // A series needs at least two points, named axes, and a real y unit.
    .filter((s: any) => s.points.length >= 2 && s.xLabel && s.yLabel && s.yUnit)
    // Reject statistics-about-the-figure masquerading as the figure's data.
    .filter(
      (s: any) =>
        !STATISTIC_LABEL_RE.test(s.yLabel) &&
        !STATISTIC_LABEL_RE.test(s.yUnit) &&
        !STATISTIC_LABEL_RE.test(s.label)
    )
    // The y quantity must match an axis actually read off the figure. This is
    // what ties a "reconstruction" to the thing it claims to reconstruct.
    .filter((s: any) => matchesFigureAxis(s.yLabel, analysis));

  if (clean.length === 0) return null;

  const evidence = String(raw.evidence ?? "").trim();
  // Either mode must say where the numbers came from, or the result can't be
  // audited by a reviewer.
  if (evidence.length < 20) return null;

  const chartTypes = ["bar", "line", "scatter", "box", "survival"];
  const chartType = chartTypes.includes(raw.chartType) ? raw.chartType : "bar";

  // Anything not explicitly claimed as quoted is treated as estimated. The
  // default has to fall on the cautious side: mislabelling an estimate as the
  // paper's data is the failure that actually matters here.
  const estimated = raw.source !== "paper_text";

  const rawConfidence = Number(raw.estimateConfidence);
  const estimateConfidence = estimated
    ? Number.isFinite(rawConfidence)
      ? Math.min(1, Math.max(0, rawConfidence))
      : 0.5
    : null;

  // A barely-legible estimate is not worth charting.
  if (estimated && estimateConfidence !== null && estimateConfidence < 0.35) {
    return null;
  }

  return {
    source: estimated ? "vision_estimated" : "paper_text",
    chartType,
    evidence: evidence.slice(0, 1500),
    series: clean,
    estimated,
    estimateConfidence,
  };
}

/**
 * True when a recovered y-label corresponds to an axis or legend entry that
 * was actually read off the figure. Matching is loose (shared significant
 * word) because a model rarely reproduces an axis title character-for-character.
 */
function matchesFigureAxis(yLabel: string, analysis: FigureAnalysis): boolean {
  const readable = [...analysis.labels, ...analysis.units];
  if (readable.length === 0) return false;

  const significant = (text: string) =>
    text
      .toLowerCase()
      .split(/[^a-z0-9μ%]+/i)
      .filter((w) => w.length > 3);

  const target = significant(yLabel);
  if (target.length === 0) return false;

  return readable.some((label) => {
    const words = significant(label);
    return words.some((w) => target.includes(w));
  });
}

/** Analyze one figure. Throws on API failure so the caller can decide. */
export async function analyzeFigure(
  figure: ExtractedFigure,
  paperContext: string
): Promise<{ analysis: FigureAnalysis; data: FigureData | null }> {
  const imagePath = path.join(figureAssetRoot(figure.projectId), figure.assetPath);
  const imageBase64 = (await readFile(imagePath)).toString("base64");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: imageBase64 },
          },
          {
            type: "text",
            text: [
              `CAPTION:\n${figure.caption}`,
              figure.referenceContext
                ? `\n\nHOW THE PAPER DISCUSSES THIS FIGURE:\n${figure.referenceContext}`
                : "",
              paperContext ? `\n\nPAPER CONTEXT:\n${paperContext.slice(0, 6000)}` : "",
            ].join(""),
          },
        ],
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("figure analysis returned no text");
  }

  const parsed = parseFirstJsonObject(block.text) as {
    analysis?: unknown;
    data?: unknown;
  };
  const analysis = coerceAnalysis(parsed.analysis);
  return { analysis, data: coerceData(parsed.data, analysis) };
}
