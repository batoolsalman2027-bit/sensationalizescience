/**
 * Figure ranking and recreation-method routing.
 *
 * Two separate jobs, deliberately kept apart:
 *   - scoreFigures() asks the model to judge each figure on five axes.
 *   - routeRecreation() decides, deterministically, how (or whether) a figure
 *     may become a video visual.
 *
 * The routing is code rather than model judgement on purpose. The rule that a
 * quantitative chart is only ever built from recovered numbers is a product
 * guarantee, not a preference, so it must not be re-litigated per request by a
 * language model.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseFirstJsonObject } from "./analyze";
import type {
  ExtractedFigure,
  FigureAnalysis,
  FigureData,
  FigureScores,
  RankedFigure,
  RecreationMethod,
} from "./types";

const MODEL = process.env.FIGURE_ANALYSIS_MODEL ?? "claude-sonnet-4-5-20250929";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Composite weights. Scientific importance and narrative relevance dominate:
 * a beautiful figure that doesn't carry the story is not worth screen time.
 */
const WEIGHTS = {
  scientificImportance: 0.3,
  narrativeRelevance: 0.3,
  shortFormSuitability: 0.15,
  visualClarity: 0.15,
  animatability: 0.1,
} as const;

/** How many figures we recommend by default. Most short videos support few. */
const DEFAULT_RECOMMEND_LIMIT = 3;
/** Composite below this is not worth including regardless of rank. */
const RECOMMEND_THRESHOLD = 5.5;

const SYSTEM_PROMPT = `You rank figures from a scientific paper for use in a short narrated video.

Not every figure belongs in the video. Most papers yield only two or three figures that materially help a viewer understand the finding. Be discriminating: it is correct and expected to score several figures low.

Score each figure 0-10 on five axes:
- scientificImportance: how central this figure is to the paper's actual claim.
- narrativeRelevance: how well it supports the specific narrative given below.
- shortFormSuitability: whether a viewer can grasp it in the few seconds a short
  video allows. Dense multi-panel figures score low.
- visualClarity: how legible it stays when reduced to a phone screen.
- animatability: whether the result can be communicated accurately through motion
  or progressive reveal, rather than needing careful static study.

Also give a one-sentence "rationale" per figure explaining the scores.

Output ONLY valid JSON (no markdown fences) in EXACTLY this shape:
{ "figures": [ { "id": string, "scientificImportance": number, "narrativeRelevance": number, "shortFormSuitability": number, "visualClarity": number, "animatability": number, "rationale": string } ] }`;

function composite(scores: Omit<FigureScores, "composite" | "rationale">): number {
  const raw =
    scores.scientificImportance * WEIGHTS.scientificImportance +
    scores.narrativeRelevance * WEIGHTS.narrativeRelevance +
    scores.shortFormSuitability * WEIGHTS.shortFormSuitability +
    scores.visualClarity * WEIGHTS.visualClarity +
    scores.animatability * WEIGHTS.animatability;
  return Math.round(raw * 100) / 100;
}

function clamp(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

/**
 * Decide how a figure may be recreated, or that it may not be used at all.
 *
 * Charts split by where their numbers came from. Values quoted from the paper
 * yield a data_reconstruction, which may be presented as the paper's data.
 * Values read off the plot yield an estimated_chart, which may be drawn but
 * must be labelled as an approximation everywhere it surfaces. Keeping these
 * as distinct methods rather than one method plus a flag means no downstream
 * consumer can accidentally treat an estimate as the source data.
 */
export function routeRecreation(
  analysis: FigureAnalysis,
  data: FigureData | null
): { method: RecreationMethod | null; exclusionReason: string | null } {
  switch (analysis.kind) {
    case "chart":
    case "table":
      if (data?.estimated) {
        return { method: "estimated_chart", exclusionReason: null };
      }
      if (data) return { method: "data_reconstruction", exclusionReason: null };
      return {
        method: null,
        exclusionReason:
          "Quantitative figure whose values could not be recovered from the paper and could not be read reliably off the plot.",
      };

    case "schematic":
      // Diagrams carry relationships, not measurements, so they can be redrawn
      // faithfully without recovering any numbers.
      return { method: "simplified_diagram", exclusionReason: null };

    case "micrograph":
    case "blot":
    case "photo":
    case "map":
      if (analysis.textDependent) {
        return {
          method: null,
          exclusionReason:
            "Meaning depends on fine text or annotation that will not survive at video resolution.",
        };
      }
      // These show real specimens. We depict the concept rather than
      // reproducing the imagery, which is both the honest and the safer route.
      return { method: "conceptual_illustration", exclusionReason: null };

    case "equation":
      return {
        method: null,
        exclusionReason: "Equations are rendered as typeset overlays, not recreated visuals.",
      };

    default:
      return {
        method: null,
        exclusionReason: "Figure type could not be determined confidently.",
      };
  }
}

export interface AnalyzedFigure extends ExtractedFigure {
  analysis: FigureAnalysis;
  data: FigureData | null;
}

/**
 * Score and rank analyzed figures against the intended narrative, then apply
 * routing and pick the recommended set.
 */
export async function rankFigures(
  figures: AnalyzedFigure[],
  narrative: string,
  options: { recommendLimit?: number } = {}
): Promise<RankedFigure[]> {
  if (figures.length === 0) return [];

  const limit = options.recommendLimit ?? DEFAULT_RECOMMEND_LIMIT;
  const scoresById = await requestScores(figures, narrative);

  const ranked: RankedFigure[] = figures.map((figure) => {
    const raw = scoresById.get(figure.id);
    const axes = {
      scientificImportance: clamp(raw?.scientificImportance),
      narrativeRelevance: clamp(raw?.narrativeRelevance),
      shortFormSuitability: clamp(raw?.shortFormSuitability),
      visualClarity: clamp(raw?.visualClarity),
      animatability: clamp(raw?.animatability),
    };
    const { method, exclusionReason } = routeRecreation(figure.analysis, figure.data);

    return {
      ...figure,
      scores: {
        ...axes,
        composite: composite(axes),
        rationale: String(raw?.rationale ?? "").slice(0, 500),
      },
      recreationMethod: method,
      exclusionReason,
      recommended: false,
      decision: "pending" as const,
    };
  });

  ranked.sort((a, b) => b.scores.composite - a.scores.composite);

  // Only usable figures can be recommended, and only up to the limit.
  let recommended = 0;
  for (const figure of ranked) {
    if (recommended >= limit) break;
    if (!figure.recreationMethod) continue;
    if (figure.scores.composite < RECOMMEND_THRESHOLD) continue;
    figure.recommended = true;
    recommended++;
  }

  return ranked;
}

interface RawScore {
  scientificImportance?: number;
  narrativeRelevance?: number;
  shortFormSuitability?: number;
  visualClarity?: number;
  animatability?: number;
  rationale?: string;
}

async function requestScores(
  figures: AnalyzedFigure[],
  narrative: string
): Promise<Map<string, RawScore>> {
  const catalog = figures
    .map((f) =>
      [
        `id: ${f.id}`,
        `figure number: ${f.figureNumber ?? "unknown"}`,
        `kind: ${f.analysis.kind}`,
        `panels: ${f.analysis.panelCount}`,
        `shows: ${f.analysis.summary}`,
        `result: ${f.analysis.resultDirection || "(no result shown)"}`,
        `numeric data: ${
          f.data
            ? f.data.estimated
              ? `estimated from the plot (confidence ${f.data.estimateConfidence})`
              : "quoted from the paper"
            : "none recovered"
        }`,
        `caption: ${f.caption.slice(0, 400)}`,
      ].join("\n  ")
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `INTENDED NARRATIVE FOR THE VIDEO:\n${
          narrative || "(not yet chosen — score narrative relevance against the paper's central claim)"
        }\n\nFIGURES:\n\n${catalog}`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") return new Map();

  try {
    const parsed = parseFirstJsonObject(block.text) as {
      figures?: (RawScore & { id?: string })[];
    };
    const map = new Map<string, RawScore>();
    for (const entry of parsed.figures ?? []) {
      if (entry?.id) map.set(entry.id, entry);
    }
    return map;
  } catch (err) {
    console.warn("[figures] could not parse ranking response:", err);
    return new Map();
  }
}
