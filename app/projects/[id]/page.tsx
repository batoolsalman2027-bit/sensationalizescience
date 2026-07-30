import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import FigureReviewBoard, {
  type RankedFigure,
} from "@/components/figures/FigureReviewBoard";

export const metadata: Metadata = {
  title: "Figure review — Sensationalize Science",
};

const STATUS_LABELS: Record<string, string> = {
  materials_received: "Materials received",
  paper_under_review: "Paper under review",
  figures_selected: "Figures selected",
  narrative_in_development: "Narrative in development",
  in_production: "Video in production",
  draft_ready: "Draft ready for lab review",
  revisions_requested: "Revisions requested",
  final_approved: "Final approved",
  delivered: "Delivered",
  failed: "Failed",
};

// Frontend-only preview: static placeholder project + figures (no database).
const PROJECT = {
  paperTitle: "Activity-dependent stabilization of dendritic spines",
  status: "draft_ready",
};

const FIGURES: RankedFigure[] = [
  {
    id: "fig-1",
    figureNumber: 2,
    recommended: true,
    section: "Results",
    caption:
      "Figure 2. Spine survival over 14 days for stimulated versus control synapses.",
    assetPath: "fig-2.png",
    bounds: { page: 5 },
    recreationMethod: "data_reconstruction",
    exclusionReason: null,
    decision: "pending",
    analysis: {
      kind: "line chart",
      panelCount: 2,
      summary:
        "Stimulated spines persist markedly longer than unstimulated controls across the imaging window.",
      resultDirection: "Stimulation increases spine survival",
    },
    scores: {
      composite: 8.6,
      scientificImportance: 9,
      narrativeRelevance: 9,
      shortFormSuitability: 8,
      visualClarity: 8,
      animatability: 9,
      rationale:
        "Clean two-series comparison with a clear, animatable trend that carries the paper's central claim.",
    },
    data: {
      estimated: false,
      estimateConfidence: null,
      evidence: "Values quoted from Table S2.",
      series: [
        {
          label: "Stimulated",
          xLabel: "Day",
          yLabel: "Surviving spines",
          yUnit: "%",
          points: [
            { x: 0, y: 100 },
            { x: 7, y: 82 },
            { x: 14, y: 71 },
          ],
        },
        {
          label: "Control",
          xLabel: "Day",
          yLabel: "Surviving spines",
          yUnit: "%",
          points: [
            { x: 0, y: 100 },
            { x: 7, y: 58 },
            { x: 14, y: 39 },
          ],
        },
      ],
    },
  },
  {
    id: "fig-2",
    figureNumber: 3,
    recommended: false,
    section: "Results",
    caption: "Figure 3. Representative two-photon micrographs of dendritic segments.",
    assetPath: "fig-3.png",
    bounds: { page: 6 },
    recreationMethod: "estimated_chart",
    exclusionReason: null,
    decision: "pending",
    analysis: {
      kind: "micrograph",
      panelCount: 4,
      summary: "Qualitative imaging panels supporting the survival quantification.",
      resultDirection: null,
    },
    scores: {
      composite: 5.4,
      scientificImportance: 6,
      narrativeRelevance: 5,
      shortFormSuitability: 4,
      visualClarity: 6,
      animatability: 5,
      rationale: "Illustrative but hard to read at short-form scale.",
    },
    data: {
      estimated: true,
      estimateConfidence: 0.62,
      evidence: "Spine counts read off the micrograph panels by a model.",
      series: [
        {
          label: "Spine density",
          xLabel: "Condition",
          yLabel: "Spines / 10µm",
          yUnit: null,
          points: [
            { x: "Stimulated", y: 7.2 },
            { x: "Control", y: 4.1 },
          ],
        },
      ],
    },
  },
];

const EVENTS = [
  {
    id: "e1",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    action: "materials_received",
    figureId: null as string | null,
    actor: "system",
  },
  {
    id: "e2",
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    action: "figures_ranked",
    figureId: null as string | null,
    actor: "pipeline",
  },
];

export default function ProjectReviewPage() {
  const figures = FIGURES;
  const events = EVENTS;
  const usable = figures.filter((f) => f.recreationMethod);

  return (
    <section className="section" style={{ paddingTop: 44 }}>
      <Container>
        <nav className="qc-breadcrumb" aria-label="Breadcrumb">
          <Link href="/projects">Projects</Link>
          <span aria-hidden="true">/</span>
          <span>Figure review</span>
        </nav>

        <header className="qc-header">
          <div>
            <h1 className="section-title" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
              {PROJECT.paperTitle}
            </h1>
            <p className="qc-meta">
              <span className="qc-status">
                {STATUS_LABELS[PROJECT.status] ?? PROJECT.status}
              </span>
              {figures.length} figure{figures.length === 1 ? "" : "s"} extracted ·{" "}
              {usable.length} usable · {figures.filter((f) => f.recommended).length}{" "}
              recommended
            </p>
          </div>
        </header>

        <p className="qc-intro">
          Internal quality control. Check each derived visual against the figure as
          printed, then approve, reject, or mark it for replacement. Every decision
          is recorded in the audit trail below.
        </p>

        <FigureReviewBoard projectId="demo" initialFigures={figures} />

        <section className="qc-audit" aria-labelledby="audit-heading">
          <h2 id="audit-heading">Audit trail</h2>
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <time dateTime={new Date(event.createdAt).toISOString()}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>
                <span className="qc-audit-action">{event.action.replace(/_/g, " ")}</span>
                {event.figureId && <span className="qc-audit-fig">{event.figureId}</span>}
                <span className="qc-audit-actor">{event.actor}</span>
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </section>
  );
}
