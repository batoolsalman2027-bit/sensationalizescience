import { randomUUID } from "crypto";
import { db } from "./db";
import type { ContactSubjectId } from "@/config/pricing";

export type ContactStatus = "new" | "in_progress" | "resolved";

export type ContactSubmissionRow = {
  id: string;
  name: string;
  email: string;
  subject: ContactSubjectId;
  message: string;
  status: ContactStatus;
  userId: string | null;
  internalNotes: string | null;
  createdAt: number;
  resolvedAt: number | null;
};

export type CreateContactInput = {
  name: string;
  email: string;
  subject: ContactSubjectId;
  message: string;
  userId?: string | null;
};

let ensured = false;
function ensureTable() {
  if (ensured) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      userId TEXT,
      internalNotes TEXT,
      createdAt INTEGER NOT NULL,
      resolvedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions (status);
  `);
  ensured = true;
}

export function createContactSubmission(input: CreateContactInput): ContactSubmissionRow {
  ensureTable();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO contact_submissions
      (id, name, email, subject, message, status, userId, internalNotes, createdAt, resolvedAt)
     VALUES (?, ?, ?, ?, ?, 'new', ?, NULL, ?, NULL)`
  ).run(
    id,
    input.name.trim(),
    input.email.trim().toLowerCase(),
    input.subject,
    input.message.trim(),
    input.userId ?? null,
    now
  );
  return getContactSubmission(id)!;
}

export function getContactSubmission(id: string): ContactSubmissionRow | undefined {
  ensureTable();
  return db.prepare(`SELECT * FROM contact_submissions WHERE id = ?`).get(id) as
    | ContactSubmissionRow
    | undefined;
}

export function listContactSubmissions(): ContactSubmissionRow[] {
  ensureTable();
  return db
    .prepare(`SELECT * FROM contact_submissions ORDER BY createdAt DESC`)
    .all() as ContactSubmissionRow[];
}

export function countNewContactSubmissions(): number {
  ensureTable();
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM contact_submissions WHERE status = 'new'`)
    .get() as { n: number };
  return row.n;
}

export function updateContactSubmission(
  id: string,
  patch: { status?: ContactStatus; internalNotes?: string | null }
): ContactSubmissionRow | undefined {
  ensureTable();
  const existing = getContactSubmission(id);
  if (!existing) return undefined;

  const status = patch.status ?? existing.status;
  let resolvedAt = existing.resolvedAt;
  if (status === "resolved" && existing.status !== "resolved") {
    resolvedAt = Date.now();
  } else if (status !== "resolved") {
    resolvedAt = null;
  }

  const notes =
    patch.internalNotes !== undefined ? patch.internalNotes : existing.internalNotes;

  db.prepare(
    `UPDATE contact_submissions
     SET status = ?, internalNotes = ?, resolvedAt = ?
     WHERE id = ?`
  ).run(status, notes, resolvedAt, id);

  return getContactSubmission(id);
}
