"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleSlash,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { FigureDecision, RankedFigure } from "@/lib/figures/types";

/**
 * Internal quality-control board for a project's extracted figures.
 *
 * Built for the production team rather than the customer: every figure is
 * shown with the original crop beside whatever the pipeline derived from it,
 * so an operator can catch a bad reading before it reaches a video. Estimated
 * charts are called out loudly — those values were read off the plot by a
 * model and are the ones most likely to be wrong.
 */

const METHOD_LABELS: Record<string, { label: string; tone: string }> = {
  data_reconstruction: { label: "Data reconstruction", tone: "ok" },
  estimated_chart: { label: "Estimated chart", tone: "warn" },
  simplified_diagram: { label: "Simplified diagram", tone: "ok" },
  conceptual_illustration: { label: "Conceptual illustration", tone: "neutral" },
  decorative: { label: "Decorative", tone: "neutral" },
};

const SCORE_AXES: { key: keyof RankedFigure["scores"]; label: string }[] = [
  { key: "scientificImportance", label: "Importance" },
  { key: "narrativeRelevance", label: "Relevance" },
  { key: "shortFormSuitability", label: "Short-form fit" },
  { key: "visualClarity", label: "Clarity" },
  { key: "animatability", label: "Animatability" },
];

export default function FigureReviewBoard({
  projectId,
  initialFigures,
}: {
  projectId: string;
  initialFigures: RankedFigure[];
}) {
  const [figures, setFigures] = useState(initialFigures);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; message: string } | null>(null);

  const estimatedCount = useMemo(
    () => figures.filter((f) => f.data?.estimated).length,
    [figures]
  );

  const decide = useCallback(
    async (figureId: string, decision: FigureDecision) => {
      setBusyId(figureId);
      setErrorId(null);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/figures/${figureId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save decision");
        setFigures((prev) =>
          prev.map((f) => (f.id === figureId ? { ...f, decision: data.figure.decision } : f))
        );
      } catch (err: any) {
        setErrorId({ id: figureId, message: err.message });
      } finally {
        setBusyId(null);
      }
    },
    [projectId]
  );

  if (figures.length === 0) {
    return (
      <div className="qc-empty">
        <CircleSlash size={26} strokeWidth={1.5} aria-hidden="true" />
        <h3>No figures were extracted</h3>
        <p>
          The paper may have no captioned figures, or the PDF may be a scan.
          Scanned documents need OCR before figures can be located.
        </p>
      </div>
    );
  }

  return (
    <>
      {estimatedCount > 0 && (
        <div className="qc-alert" role="status">
          <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>
              {estimatedCount} figure{estimatedCount === 1 ? "" : "s"} use estimated
              values
            </strong>
            <p>
              These numbers were read off the plot by a model, not quoted from the
              paper. Check each series against the original figure — direction and
              relative magnitude matter most. Estimates have been observed to
              invert results and to mix values between panels of the same figure.
            </p>
          </div>
        </div>
      )}

      <ol className="qc-list">
        {figures.map((figure) => (
          <FigureCard
            key={figure.id}
            projectId={projectId}
            figure={figure}
            busy={busyId === figure.id}
            error={errorId?.id === figure.id ? errorId.message : null}
            onDecide={decide}
          />
        ))}
      </ol>
    </>
  );
}

function FigureCard({
  projectId,
  figure,
  busy,
  error,
  onDecide,
}: {
  projectId: string;
  figure: RankedFigure;
  busy: boolean;
  error: string | null;
  onDecide: (figureId: string, decision: FigureDecision) => void;
}) {
  const [showCaption, setShowCaption] = useState(false);
  const method = figure.recreationMethod
    ? METHOD_LABELS[figure.recreationMethod]
    : null;
  const estimated = figure.data?.estimated ?? false;

  return (
    <li className={`qc-card${estimated ? " estimated" : ""}`}>
      <div className="qc-card-head">
        <div className="qc-title">
          <h3>
            Figure {figure.figureNumber ?? "—"}
            {figure.recommended && <span className="qc-tag rec">Recommended</span>}
          </h3>
          <div className="qc-tags">
            <span className="qc-tag">{figure.analysis.kind}</span>
            {method ? (
              <span className={`qc-tag ${method.tone}`}>{method.label}</span>
            ) : (
              <span className="qc-tag off">Not usable</span>
            )}
            {figure.analysis.panelCount > 1 && (
              <span className="qc-tag">{figure.analysis.panelCount} panels</span>
            )}
          </div>
        </div>
        <div className="qc-score" title="Weighted composite score out of 10">
          <strong>{figure.scores.composite.toFixed(1)}</strong>
          <span>/ 10</span>
        </div>
      </div>

      <div className="qc-body">
        {/* Original crop — the reference an operator checks everything against. */}
        <figure className="qc-source">
          <img
            src={`/api/projects/${projectId}/assets/${figure.assetPath}`}
            alt={`Figure ${figure.figureNumber ?? ""} as printed in the paper`}
            loading="lazy"
          />
          <figcaption>
            Page {figure.bounds.page}
            {figure.section ? ` · ${figure.section}` : ""} · as printed
          </figcaption>
        </figure>

        <div className="qc-detail">
          {figure.analysis.summary && (
            <p className="qc-summary">{figure.analysis.summary}</p>
          )}
          {figure.analysis.resultDirection && (
            <p className="qc-direction">
              <span>Result</span>
              {figure.analysis.resultDirection}
            </p>
          )}

          {figure.exclusionReason && (
            <p className="qc-exclusion">{figure.exclusionReason}</p>
          )}

          {figure.data && (
            <div className={`qc-data${estimated ? " estimated" : ""}`}>
              <div className="qc-data-head">
                {estimated ? (
                  <>
                    <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />
                    Estimated from the plot — verify against the figure
                    {figure.data.estimateConfidence !== null && (
                      <span className="qc-conf">
                        model confidence{" "}
                        {Math.round(figure.data.estimateConfidence * 100)}%
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    Values quoted from the paper
                  </>
                )}
              </div>

              {figure.data.series.map((series) => (
                <div key={series.label} className="qc-series">
                  <p className="qc-series-name">
                    {series.label}
                    <span>
                      {series.yLabel}
                      {series.yUnit ? ` (${series.yUnit})` : ""} vs {series.xLabel}
                    </span>
                  </p>
                  <div className="qc-table-wrap">
                    <table className="qc-table">
                      <caption className="sr-only">
                        {series.label}: {series.yLabel} by {series.xLabel}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">{series.xLabel || "x"}</th>
                          <th scope="col">{series.yLabel || "y"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {series.points.map((point, i) => (
                          <tr key={`${point.x}-${i}`}>
                            <td>{String(point.x)}</td>
                            <td>{point.y}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <p className="qc-evidence">
                <span>{estimated ? "How it was read" : "Source"}</span>
                {figure.data.evidence}
              </p>
            </div>
          )}

          <div className="qc-scores" aria-label="Score breakdown">
            {SCORE_AXES.map((axis) => (
              <div key={axis.key} className="qc-axis">
                <span className="qc-axis-label">{axis.label}</span>
                <span
                  className="qc-axis-bar"
                  role="img"
                  aria-label={`${axis.label}: ${figure.scores[axis.key]} out of 10`}
                >
                  <i style={{ width: `${(figure.scores[axis.key] as number) * 10}%` }} />
                </span>
                <span className="qc-axis-value">{figure.scores[axis.key] as number}</span>
              </div>
            ))}
          </div>

          {figure.scores.rationale && (
            <p className="qc-rationale">{figure.scores.rationale}</p>
          )}

          <button
            type="button"
            className="qc-caption-toggle"
            onClick={() => setShowCaption((v) => !v)}
            aria-expanded={showCaption}
          >
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              style={{ transform: showCaption ? "rotate(180deg)" : undefined }}
              aria-hidden="true"
            />
            {showCaption ? "Hide" : "Show"} original caption
          </button>
          {showCaption && <p className="qc-caption">{figure.caption}</p>}
        </div>
      </div>

      <div className="qc-actions">
        <span className={`qc-decision ${figure.decision}`}>
          {figure.decision === "pending" ? "Awaiting review" : figure.decision}
        </span>
        <div className="qc-buttons">
          <button
            type="button"
            className="qc-btn approve"
            onClick={() => onDecide(figure.id, "approved")}
            disabled={busy || figure.decision === "approved"}
          >
            {busy ? (
              <Loader2 size={15} className="qc-spin" aria-hidden="true" />
            ) : (
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            )}
            Approve
          </button>
          <button
            type="button"
            className="qc-btn reject"
            onClick={() => onDecide(figure.id, "rejected")}
            disabled={busy || figure.decision === "rejected"}
          >
            <X size={15} strokeWidth={2.5} aria-hidden="true" />
            Reject
          </button>
          <button
            type="button"
            className="qc-btn"
            onClick={() => onDecide(figure.id, "replaced")}
            disabled={busy || figure.decision === "replaced"}
          >
            <RefreshCw size={14} strokeWidth={2.25} aria-hidden="true" />
            Mark for replacement
          </button>
        </div>
      </div>

      {error && (
        <p className="qc-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => onDecide(figure.id, "approved")}>
            Retry
          </button>
        </p>
      )}
    </li>
  );
}
