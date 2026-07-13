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
}

function rowToJob(row: JobRow): VideoJob {
  return {
    id: row.id,
    status: row.status,
    videoUrl: row.videoUrl ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt,
  };
}

export function createJob(id: string): VideoJob {
  const job: VideoJob = { id, status: "pending", createdAt: Date.now() };
  db.prepare(
    `INSERT INTO jobs (id, status, videoUrl, error, createdAt) VALUES (?, ?, ?, ?, ?)`
  ).run(job.id, job.status, null, null, job.createdAt);
  return job;
}

export function updateJob(id: string, patch: Partial<VideoJob>): VideoJob | undefined {
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

export function getJob(id: string): VideoJob | undefined {
  const row = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
  return row ? rowToJob(row) : undefined;
}

/** Completed renders, newest first — powers the "My Library" tab. */
export function listDoneJobs(): VideoJob[] {
  const rows = db
    .prepare(`SELECT * FROM jobs WHERE status = 'done' ORDER BY createdAt DESC`)
    .all() as JobRow[];
  return rows.map(rowToJob);
}
