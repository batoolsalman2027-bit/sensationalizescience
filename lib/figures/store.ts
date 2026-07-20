/**
 * Persistence for projects, figures, provenance, and the review audit trail.
 *
 * Typed structures (analysis, recovered data, scores) are stored as JSON in
 * single columns rather than normalized into tables. They are read and written
 * whole, never queried field-by-field, so columns would buy nothing but
 * migration cost. Everything that IS queried — status, decision, score,
 * project — is a real column.
 */

import { randomUUID } from "node:crypto";
import { db } from "../db";
import type {
  FigureAnalysis,
  FigureBounds,
  FigureData,
  FigureDecision,
  FigureScores,
  RankedFigure,
  RecreationMethod,
  ReviewEvent,
  VisualProvenance,
} from "./types";

/** Lifecycle of a production project. */
export type ProjectStatus =
  | "materials_received"
  | "paper_under_review"
  | "figures_selected"
  | "narrative_in_development"
  | "in_production"
  | "draft_ready"
  | "revisions_requested"
  | "final_approved"
  | "delivered"
  | "failed";

export interface Project {
  id: string;
  userId: string | null;
  status: ProjectStatus;
  paperTitle: string | null;
  paperDoi: string | null;
  paperAuthors: string | null;
  paperJournal: string | null;
  sourceFileName: string | null;
  narrative: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ProjectRow {
  id: string;
  userId: string | null;
  status: string;
  paperTitle: string | null;
  paperDoi: string | null;
  paperAuthors: string | null;
  paperJournal: string | null;
  sourceFileName: string | null;
  narrative: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToProject(row: ProjectRow): Project {
  return { ...row, status: row.status as ProjectStatus };
}

export function createProject(input: {
  id: string;
  userId?: string | null;
  sourceFileName?: string | null;
}): Project {
  const now = Date.now();
  db.prepare(
    `INSERT INTO projects (id, userId, status, paperTitle, paperDoi, paperAuthors,
       paperJournal, sourceFileName, narrative, createdAt, updatedAt)
     VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`
  ).run(
    input.id,
    input.userId ?? null,
    "materials_received" satisfies ProjectStatus,
    input.sourceFileName ?? null,
    now,
    now
  );
  return getProject(input.id)!;
}

export function updateProject(
  id: string,
  patch: Partial<
    Pick<
      Project,
      | "status"
      | "paperTitle"
      | "paperDoi"
      | "paperAuthors"
      | "paperJournal"
      | "narrative"
    >
  >
): Project | undefined {
  const existing = getProject(id);
  if (!existing) return undefined;
  const next = { ...existing, ...patch, updatedAt: Date.now() };
  db.prepare(
    `UPDATE projects SET status = ?, paperTitle = ?, paperDoi = ?, paperAuthors = ?,
       paperJournal = ?, narrative = ?, updatedAt = ? WHERE id = ?`
  ).run(
    next.status,
    next.paperTitle,
    next.paperDoi,
    next.paperAuthors,
    next.paperJournal,
    next.narrative,
    next.updatedAt,
    id
  );
  return next;
}

export function getProject(id: string): Project | undefined {
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | ProjectRow
    | undefined;
  return row ? rowToProject(row) : undefined;
}

export function listProjects(userId?: string | null): Project[] {
  const rows = (
    userId
      ? db
          .prepare(`SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC`)
          .all(userId)
      : db.prepare(`SELECT * FROM projects ORDER BY createdAt DESC`).all()
  ) as ProjectRow[];
  return rows.map(rowToProject);
}

// ---------- figures ----------

interface FigureRow {
  id: string;
  projectId: string;
  figureNumber: string | null;
  caption: string;
  section: string | null;
  referenceContext: string | null;
  boundsJson: string;
  assetPath: string;
  width: number;
  height: number;
  analysisJson: string | null;
  dataJson: string | null;
  scoresJson: string | null;
  recreationMethod: string | null;
  exclusionReason: string | null;
  recommended: number;
  decision: string;
  createdAt: number;
}

/** Parse a JSON column, returning null rather than throwing on corruption. */
function parseJsonColumn<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const EMPTY_ANALYSIS: FigureAnalysis = {
  kind: "unknown",
  summary: "",
  resultDirection: "",
  labels: [],
  units: [],
  panelCount: 1,
  textDependent: false,
};

const EMPTY_SCORES: FigureScores = {
  scientificImportance: 0,
  narrativeRelevance: 0,
  shortFormSuitability: 0,
  visualClarity: 0,
  animatability: 0,
  composite: 0,
  rationale: "",
};

function rowToFigure(row: FigureRow): RankedFigure {
  return {
    id: row.id,
    projectId: row.projectId,
    figureNumber: row.figureNumber,
    caption: row.caption,
    section: row.section,
    referenceContext: row.referenceContext ?? "",
    bounds: parseJsonColumn<FigureBounds>(row.boundsJson) ?? {
      page: 0,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    assetPath: row.assetPath,
    width: row.width,
    height: row.height,
    analysis: parseJsonColumn<FigureAnalysis>(row.analysisJson) ?? EMPTY_ANALYSIS,
    data: parseJsonColumn<FigureData>(row.dataJson),
    scores: parseJsonColumn<FigureScores>(row.scoresJson) ?? EMPTY_SCORES,
    recreationMethod: (row.recreationMethod as RecreationMethod | null) ?? null,
    exclusionReason: row.exclusionReason,
    recommended: row.recommended === 1,
    decision: row.decision as FigureDecision,
  };
}

/** Replace a project's figure set. Runs in a transaction. */
export function saveFigures(projectId: string, figures: RankedFigure[]): void {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO figures (id, projectId, figureNumber, caption, section,
       referenceContext, boundsJson, assetPath, width, height, analysisJson,
       dataJson, scoresJson, recreationMethod, exclusionReason, recommended,
       decision, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const now = Date.now();

  const run = db.transaction((rows: RankedFigure[]) => {
    db.prepare(`DELETE FROM figures WHERE projectId = ?`).run(projectId);
    for (const figure of rows) {
      insert.run(
        figure.id,
        projectId,
        figure.figureNumber,
        figure.caption,
        figure.section,
        figure.referenceContext,
        JSON.stringify(figure.bounds),
        figure.assetPath,
        figure.width,
        figure.height,
        JSON.stringify(figure.analysis),
        figure.data ? JSON.stringify(figure.data) : null,
        JSON.stringify(figure.scores),
        figure.recreationMethod,
        figure.exclusionReason,
        figure.recommended ? 1 : 0,
        figure.decision,
        now
      );
    }
  });

  run(figures);
}

export function listFigures(projectId: string): RankedFigure[] {
  const rows = db
    .prepare(`SELECT * FROM figures WHERE projectId = ? ORDER BY createdAt ASC`)
    .all(projectId) as FigureRow[];
  return rows
    .map(rowToFigure)
    .sort((a, b) => b.scores.composite - a.scores.composite);
}

export function getFigure(projectId: string, figureId: string): RankedFigure | undefined {
  const row = db
    .prepare(`SELECT * FROM figures WHERE projectId = ? AND id = ?`)
    .get(projectId, figureId) as FigureRow | undefined;
  return row ? rowToFigure(row) : undefined;
}

/** Record a reviewer's decision on a figure and audit it. */
export function setFigureDecision(
  projectId: string,
  figureId: string,
  decision: FigureDecision,
  actor: string,
  note?: string
): RankedFigure | undefined {
  const figure = getFigure(projectId, figureId);
  if (!figure) return undefined;

  db.prepare(`UPDATE figures SET decision = ? WHERE projectId = ? AND id = ?`).run(
    decision,
    projectId,
    figureId
  );
  recordReviewEvent({
    projectId,
    figureId,
    action: `figure_${decision}`,
    actor,
    detail: note ? JSON.stringify({ note }) : null,
  });

  return getFigure(projectId, figureId);
}

// ---------- provenance ----------

export function recordProvenance(
  input: Omit<VisualProvenance, "id" | "createdAt">
): VisualProvenance {
  const record: VisualProvenance = {
    ...input,
    id: randomUUID(),
    createdAt: Date.now(),
  };
  db.prepare(
    `INSERT INTO visual_provenance (id, projectId, figureId, paperTitle, paperDoi,
       originalFigureNumber, originalCaption, paperSection, method, dataSource,
       generatorModel, generatorPrompt, approvalStatus, approvedBy, approvedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.id,
    record.projectId,
    record.figureId,
    record.paperTitle,
    record.paperDoi,
    record.originalFigureNumber,
    record.originalCaption,
    record.paperSection,
    record.method,
    record.dataSource,
    record.generatorModel,
    record.generatorPrompt,
    record.approvalStatus,
    record.approvedBy,
    record.approvedAt,
    record.createdAt
  );
  return record;
}

export function listProvenance(projectId: string): VisualProvenance[] {
  return db
    .prepare(
      `SELECT * FROM visual_provenance WHERE projectId = ? ORDER BY createdAt ASC`
    )
    .all(projectId) as VisualProvenance[];
}

// ---------- audit ----------

export function recordReviewEvent(
  input: Omit<ReviewEvent, "id" | "createdAt">
): ReviewEvent {
  const event: ReviewEvent = { ...input, id: randomUUID(), createdAt: Date.now() };
  db.prepare(
    `INSERT INTO review_events (id, projectId, figureId, action, actor, detail, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    event.id,
    event.projectId,
    event.figureId,
    event.action,
    event.actor,
    event.detail,
    event.createdAt
  );
  return event;
}

export function listReviewEvents(projectId: string): ReviewEvent[] {
  return db
    .prepare(
      `SELECT * FROM review_events WHERE projectId = ? ORDER BY createdAt ASC`
    )
    .all(projectId) as ReviewEvent[];
}
