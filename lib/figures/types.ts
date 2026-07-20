/**
 * Types for the scientific figure pipeline: extraction -> classification ->
 * data recovery -> ranking -> recreation.
 *
 * Design rule that shapes most of this file: a visual may only be presented as
 * a faithful reconstruction of the paper's data when the underlying numbers
 * were actually recovered from an authoritative source. Everything else is
 * explicitly typed as something weaker so the distinction can never be lost
 * further down the pipeline.
 */

/** Where a figure sits on its page, in PDF user-space points. */
export interface FigureBounds {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What kind of graphic this is, independent of how we'll recreate it. */
export type FigureKind =
  | "chart" // quantitative plot: bar, line, scatter, box, survival, forest
  | "micrograph" // microscopy / imaging data
  | "blot" // gel, western blot, electrophoresis
  | "schematic" // labelled diagram of a mechanism, device, or workflow
  | "photo" // photograph of apparatus, organism, or field site
  | "map" // geographic or spatial distribution
  | "table" // tabular data rendered as an image
  | "equation"
  | "unknown";

/**
 * How a figure may be turned into a video visual. Ordered from most to least
 * bound to the source data.
 */
export type RecreationMethod =
  | "data_reconstruction" // programmatic chart from values quoted in the source
  | "estimated_chart" // programmatic chart from values read off the plot
  | "simplified_diagram" // structured SVG of relationships, no invented data
  | "conceptual_illustration" // generative image of the underlying idea
  | "decorative"; // transition / background; carries no scientific claim

/**
 * Methods whose output may be presented as the paper's actual data. Kept as an
 * explicit set so no call site has to remember which methods qualify.
 * `estimated_chart` is deliberately absent.
 */
export const DATA_FAITHFUL_METHODS: readonly RecreationMethod[] = [
  "data_reconstruction",
];

export function isDataFaithful(method: RecreationMethod | null): boolean {
  return method !== null && DATA_FAITHFUL_METHODS.includes(method);
}

/** Reviewer decision on a candidate figure. */
export type FigureDecision = "pending" | "approved" | "rejected" | "replaced";

/**
 * Where recovered numbers came from, in descending order of authority.
 *
 * The distinction is load-bearing: only the first two are the paper's actual
 * reported values. `vision_estimated` numbers were read off the plotted marks
 * by a model and are approximations — they may be charted, but they must never
 * be described to a reviewer or a viewer as the paper's data.
 */
export type DataProvenanceSource =
  | "supplementary_file" // authoritative: author-supplied data file
  | "paper_text" // stated in body text, tables, or caption
  | "vision_estimated" // read off the plot by a model; approximate
  | "unavailable"; // could not be recovered at all

/** A single recovered numeric series, with the evidence that justifies it. */
export interface DataSeries {
  label: string;
  /** Axis/unit metadata is required — a number without units is not reportable. */
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  points: { x: number | string; y: number }[];
  /** Error bars, when the paper reports them. */
  error?: { y: number }[];
}

/**
 * Numbers recovered for a figure. `source` is never "unavailable" on a
 * populated series set — absence is represented by a null FigureData instead.
 */
export interface FigureData {
  source: Exclude<DataProvenanceSource, "unavailable">;
  series: DataSeries[];
  /**
   * For quoted data: the verbatim text the numbers were read out of, so a
   * reviewer can check the claim without reopening the PDF.
   * For estimated data: a note on what was read off the plot and how.
   */
  evidence: string;
  /** Chart form the recovered data should be drawn as. */
  chartType: "bar" | "line" | "scatter" | "box" | "survival";
  /**
   * True when values were read off the plotted marks rather than quoted.
   * Redundant with `source` by design — this is the flag every downstream
   * consumer checks, and a boolean is far harder to ignore than one member of
   * a string union.
   */
  estimated: boolean;
  /** Model's self-reported confidence in an estimate, 0-1. Null when quoted. */
  estimateConfidence: number | null;
}

/** Model's reading of what a figure demonstrates. */
export interface FigureAnalysis {
  kind: FigureKind;
  /** One sentence: what this figure shows. */
  summary: string;
  /** The direction of the result, e.g. "treated group declined vs control". */
  resultDirection: string;
  /** Labels, units, and axis text read off the figure — preserved downstream. */
  labels: string[];
  units: string[];
  /** Panel count, for multi-panel figures. */
  panelCount: number;
  /** True when the figure's message depends on text too fine to survive video. */
  textDependent: boolean;
}

/** Multi-criteria score. Each axis is 0-10. */
export interface FigureScores {
  scientificImportance: number;
  narrativeRelevance: number;
  shortFormSuitability: number;
  visualClarity: number;
  animatability: number;
  /** Weighted composite, computed deterministically from the axes above. */
  composite: number;
  /** Why the model scored it this way — shown to the reviewer. */
  rationale: string;
}

/** A figure extracted from a paper, as it moves through the pipeline. */
export interface ExtractedFigure {
  id: string;
  projectId: string;
  /** Figure number as printed in the paper, e.g. "1", "2A". Null if unlabelled. */
  figureNumber: string | null;
  /** Full caption text, bound by position rather than by index. */
  caption: string;
  /** Paper section the figure is referenced from, when determinable. */
  section: string | null;
  /** Body text near the in-text reference to this figure. */
  referenceContext: string;
  bounds: FigureBounds;
  /** Path to the cropped PNG, relative to the project's asset root. */
  assetPath: string;
  width: number;
  height: number;
}

/** An extracted figure after analysis, data recovery, and scoring. */
export interface RankedFigure extends ExtractedFigure {
  analysis: FigureAnalysis;
  data: FigureData | null;
  scores: FigureScores;
  /** Method the router selected, or null when the figure is not usable. */
  recreationMethod: RecreationMethod | null;
  /** Set when recreationMethod is null: why this figure cannot be used. */
  exclusionReason: string | null;
  recommended: boolean;
  decision: FigureDecision;
}

/**
 * Provenance for a visual produced from a figure. Every generated asset
 * carries one of these; it is the audit record that links output to source.
 */
export interface VisualProvenance {
  id: string;
  projectId: string;
  /** Source figure this visual derives from, if any. */
  figureId: string | null;
  paperTitle: string;
  paperDoi: string | null;
  originalFigureNumber: string | null;
  originalCaption: string | null;
  paperSection: string | null;
  method: RecreationMethod;
  /** Where the numbers came from, for data reconstructions. */
  dataSource: DataProvenanceSource | null;
  /** Model + prompt used, for generative methods. Null for programmatic ones. */
  generatorModel: string | null;
  generatorPrompt: string | null;
  /** Human sign-off. */
  approvalStatus: FigureDecision;
  approvedBy: string | null;
  approvedAt: number | null;
  createdAt: number;
}

/** Append-only audit entry. */
export interface ReviewEvent {
  id: string;
  projectId: string;
  figureId: string | null;
  action: string;
  actor: string;
  /** JSON payload describing the change. */
  detail: string | null;
  createdAt: number;
}
