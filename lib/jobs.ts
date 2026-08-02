import type { VideoJob } from "./types";
import { db } from "./db";

/**
 * SQLite-backed job store (data/jobs.db). Replaces the old in-memory Map,
 * which lost jobs on every server restart and didn't even survive across
 * Next.js dev's per-route module bundling within the same process.
 */

interface JobRow {
  id: string;
  status: VideoJob["status"];
  videoUrl: string | null;
  error: string | null;
  createdAt: number;
  userId: string | null;
  title: string | null;
}

let migrated = false;
function ensureJobColumns() {
  if (migrated) return;
  const cols = db.prepare(`PRAGMA table_info(jobs)`).all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("userId")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN userId TEXT`);
  }
  if (!names.has("title")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN title TEXT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_user_done ON jobs (userId, status, createdAt DESC)`);
  migrated = true;
}

function rowToJob(row: JobRow): VideoJob & { userId?: string | null; title?: string | null } {
  return {
    id: row.id,
    status: row.status,
    videoUrl: row.videoUrl ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt,
    userId: row.userId,
    title: row.title,
  };
}

export function createJob(
  id: string,
  opts?: { userId?: string | null; title?: string | null }
): VideoJob {
  ensureJobColumns();
  const job: VideoJob = { id, status: "pending", createdAt: Date.now() };
  db.prepare(
    `INSERT INTO jobs (id, status, videoUrl, error, createdAt, userId, title)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    job.id,
    job.status,
    null,
    null,
    job.createdAt,
    opts?.userId ?? null,
    opts?.title ?? null
  );
  return job;
}

export function updateJob(id: string, patch: Partial<VideoJob>): VideoJob | undefined {
  ensureJobColumns();
  const existing = getJob(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  db.prepare(`UPDATE jobs SET status = ?, videoUrl = ?, error = ? WHERE id = ?`).run(
    updated.status,
    updated.videoUrl ?? null,
    updated.error ?? null,
    id
  );
  return updated;
}

export function getJob(id: string): (VideoJob & { userId?: string | null; title?: string | null }) | undefined {
  ensureJobColumns();
  const row = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
  return row ? rowToJob(row) : undefined;
}

/** Completed renders for one account — powers that user's My Library. */
export function listDoneJobsForUser(userId: string): (VideoJob & { title?: string | null })[] {
  ensureJobColumns();
  const rows = db
    .prepare(
      `SELECT * FROM jobs WHERE status = 'done' AND userId = ? ORDER BY createdAt DESC`
    )
    .all(userId) as JobRow[];
  return rows.map(rowToJob);
}

/** @deprecated Prefer listDoneJobsForUser — global listing leaks across accounts. */
export function listDoneJobs(): VideoJob[] {
  ensureJobColumns();
  const rows = db
    .prepare(`SELECT * FROM jobs WHERE status = 'done' ORDER BY createdAt DESC`)
    .all() as JobRow[];
  return rows.map(rowToJob);
}
