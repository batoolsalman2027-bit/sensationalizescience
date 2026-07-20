import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import FigureReviewBoard from "@/components/figures/FigureReviewBoard";
import {
  getProject,
  listFigures,
  listReviewEvents,
} from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Figure review — Sensationalize Science",
};

// Review state changes as operators work; never serve a cached snapshot.
export const dynamic = "force-dynamic";

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

export default async function ProjectReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const project = getProject(params.id);
  if (!project) notFound();

  const user = await getSessionUser();
  if (project.userId && project.userId !== user?.id) notFound();

  const figures = listFigures(params.id);
  const events = listReviewEvents(params.id);
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
              {project.paperTitle ?? project.sourceFileName ?? "Untitled project"}
            </h1>
            <p className="qc-meta">
              <span className="qc-status">
                {STATUS_LABELS[project.status] ?? project.status}
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

        <FigureReviewBoard projectId={params.id} initialFigures={figures} />

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
