/**
 * Orchestrates figure intake for a project:
 *   extract -> analyze each figure -> rank against the narrative -> persist.
 *
 * Every stage is auditable: the review_events table records what ran, and any
 * figure that fails analysis is kept with an explicit exclusion reason rather
 * than silently dropped. A reviewer should always be able to see that a figure
 * existed and why it isn't being used.
 */

import { extractFigures } from "./extract";
import { analyzeFigure } from "./analyze";
import { rankFigures, routeRecreation, type AnalyzedFigure } from "./rank";
import { recordReviewEvent, saveFigures, updateProject } from "./store";
import type { RankedFigure } from "./types";

/** Analysis calls run against one vision model; a little concurrency helps. */
const ANALYSIS_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

export interface FigurePipelineResult {
  figures: RankedFigure[];
  /** Figures that could not be analyzed at all. */
  failedCount: number;
}

/**
 * Run the full figure pipeline for a project and persist the result.
 *
 * `narrative` may be empty on first pass — figures are then scored against the
 * paper's central claim, and the project can be re-ranked once a narrative is
 * chosen.
 */
export async function runFigurePipeline(opts: {
  projectId: string;
  pdfBuffer: Buffer;
  paperText: string;
  narrative?: string;
  actor?: string;
}): Promise<FigurePipelineResult> {
  const { projectId, pdfBuffer, paperText } = opts;
  const actor = opts.actor ?? "system";

  updateProject(projectId, { status: "paper_under_review" });

  const extracted = await extractFigures(pdfBuffer, projectId, paperText);
  recordReviewEvent({
    projectId,
    figureId: null,
    action: "figures_extracted",
    actor,
    detail: JSON.stringify({ count: extracted.length }),
  });

  if (extracted.length === 0) {
    saveFigures(projectId, []);
    return { figures: [], failedCount: 0 };
  }

  // Analyze. A failure here is recorded rather than thrown: one unreadable
  // figure should not fail the whole paper.
  const analyzed = await mapWithConcurrency(
    extracted,
    ANALYSIS_CONCURRENCY,
    async (figure): Promise<AnalyzedFigure | { figure: typeof extracted[number]; error: string }> => {
      try {
        const { analysis, data } = await analyzeFigure(figure, paperText);
        return { ...figure, analysis, data };
      } catch (err: any) {
        console.warn(`[figures] analysis failed for ${figure.id}:`, err);
        return { figure, error: err?.message ?? "analysis failed" };
      }
    }
  );

  const ok = analyzed.filter((a): a is AnalyzedFigure => !("error" in a));
  const failed = analyzed.filter(
    (a): a is { figure: typeof extracted[number]; error: string } => "error" in a
  );

  const ranked = await rankFigures(ok, opts.narrative ?? "");

  // Keep failures visible in the review UI with an honest reason.
  const failedRows: RankedFigure[] = failed.map(({ figure, error }) => ({
    ...figure,
    analysis: {
      kind: "unknown",
      summary: "",
      resultDirection: "",
      labels: [],
      units: [],
      panelCount: 1,
      textDependent: false,
    },
    data: null,
    scores: {
      scientificImportance: 0,
      narrativeRelevance: 0,
      shortFormSuitability: 0,
      visualClarity: 0,
      animatability: 0,
      composite: 0,
      rationale: "",
    },
    recreationMethod: null,
    exclusionReason: `Could not be analyzed: ${error}`,
    recommended: false,
    decision: "pending",
  }));

  const all = [...ranked, ...failedRows];
  saveFigures(projectId, all);

  recordReviewEvent({
    projectId,
    figureId: null,
    action: "figures_ranked",
    actor,
    detail: JSON.stringify({
      analyzed: ok.length,
      failed: failed.length,
      recommended: all.filter((f) => f.recommended).map((f) => f.id),
      // Estimated charts are audited explicitly so a reviewer can find every
      // approximation in a project without inspecting each figure.
      estimated: all
        .filter((f) => f.data?.estimated)
        .map((f) => ({ id: f.id, confidence: f.data?.estimateConfidence })),
      excluded: all
        .filter((f) => !f.recreationMethod)
        .map((f) => ({ id: f.id, reason: f.exclusionReason })),
    }),
  });

  updateProject(projectId, { status: "figures_selected" });

  return { figures: all, failedCount: failed.length };
}

/** Re-score an existing project's figures once a narrative is chosen. */
export async function rerankProjectFigures(
  projectId: string,
  figures: RankedFigure[],
  narrative: string,
  actor = "system"
): Promise<RankedFigure[]> {
  const analyzable: AnalyzedFigure[] = figures
    .filter((f) => f.analysis.kind !== "unknown")
    .map((f) => ({ ...f, analysis: f.analysis, data: f.data }));

  const ranked = await rankFigures(analyzable, narrative);

  // Preserve decisions a human already made across a re-rank.
  const previousDecisions = new Map(figures.map((f) => [f.id, f.decision]));
  for (const figure of ranked) {
    const previous = previousDecisions.get(figure.id);
    if (previous && previous !== "pending") figure.decision = previous;
  }

  saveFigures(projectId, ranked);
  recordReviewEvent({
    projectId,
    figureId: null,
    action: "figures_reranked",
    actor,
    detail: JSON.stringify({ narrative: narrative.slice(0, 300) }),
  });
  return ranked;
}

export { routeRecreation };
