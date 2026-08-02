import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "./db";
import type {
  BrandingId,
  NarrationVoiceId,
  OutputAspectId,
  VideoLengthId,
} from "@/config/create-preferences";

export type VideoRequestStatus = "new" | "in_progress" | "delivered" | "archived";

export type VideoRequestRow = {
  id: string;
  status: VideoRequestStatus;
  contactEmail: string;
  userId: string | null;
  scientificField: string;
  videoLength: VideoLengthId;
  narrationVoice: NarrationVoiceId;
  aspectRatio: OutputAspectId;
  branding: BrandingId;
  sourceFileName: string;
  pdfPath: string;
  logoPath: string | null;
  logoFileName: string | null;
  notes: string | null;
  libraryJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateVideoRequestInput = {
  contactEmail: string;
  userId?: string | null;
  scientificField: string;
  videoLength: VideoLengthId;
  narrationVoice: NarrationVoiceId;
  aspectRatio: OutputAspectId;
  branding: BrandingId;
  sourceFileName: string;
  pdfBuffer: Buffer;
  logoBuffer?: Buffer | null;
  logoFileName?: string | null;
  notes?: string | null;
};

let ensured = false;
function ensureTable() {
  if (ensured) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_requests (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'new',
      contactEmail TEXT NOT NULL,
      userId TEXT,
      scientificField TEXT NOT NULL,
      videoLength TEXT NOT NULL,
      narrationVoice TEXT NOT NULL,
      aspectRatio TEXT NOT NULL,
      branding TEXT NOT NULL,
      sourceFileName TEXT NOT NULL,
      pdfPath TEXT NOT NULL,
      logoPath TEXT,
      logoFileName TEXT,
      notes TEXT,
      libraryJobId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_video_requests_created ON video_requests (createdAt DESC);
  `);
  const cols = db.prepare(`PRAGMA table_info(video_requests)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "libraryJobId")) {
    db.exec(`ALTER TABLE video_requests ADD COLUMN libraryJobId TEXT`);
  }
  ensured = true;
}

function requestsRoot() {
  return path.join(process.cwd(), "data", "video-requests");
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function extFromName(name: string, fallback: string) {
  const ext = path.extname(name).toLowerCase();
  return ext || fallback;
}

export function createVideoRequest(input: CreateVideoRequestInput): VideoRequestRow {
  ensureTable();
  const id = randomUUID();
  const now = Date.now();
  const dir = path.join(requestsRoot(), id);
  ensureDir(dir);

  const pdfName = `paper${extFromName(input.sourceFileName, ".pdf")}`;
  const pdfPath = path.join(dir, pdfName);
  fs.writeFileSync(pdfPath, input.pdfBuffer);

  let logoPath: string | null = null;
  let logoFileName: string | null = null;
  if (input.logoBuffer && input.logoBuffer.length > 0) {
    logoFileName = input.logoFileName ?? "logo.png";
    const logoDisk = `logo${extFromName(logoFileName, ".png")}`;
    logoPath = path.join(dir, logoDisk);
    fs.writeFileSync(logoPath, input.logoBuffer);
  }

  db.prepare(
    `INSERT INTO video_requests (
      id, status, contactEmail, userId, scientificField, videoLength,
      narrationVoice, aspectRatio, branding, sourceFileName, pdfPath,
      logoPath, logoFileName, notes, createdAt, updatedAt
    ) VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.contactEmail.toLowerCase(),
    input.userId ?? null,
    input.scientificField,
    input.videoLength,
    input.narrationVoice,
    input.aspectRatio,
    input.branding,
    input.sourceFileName,
    pdfPath,
    logoPath,
    logoFileName,
    input.notes ?? null,
    now,
    now
  );

  return getVideoRequest(id)!;
}

export function listVideoRequests(): VideoRequestRow[] {
  ensureTable();
  return db
    .prepare(`SELECT * FROM video_requests ORDER BY createdAt DESC`)
    .all() as VideoRequestRow[];
}

export function getVideoRequest(id: string): VideoRequestRow | undefined {
  ensureTable();
  return db.prepare(`SELECT * FROM video_requests WHERE id = ?`).get(id) as
    | VideoRequestRow
    | undefined;
}

export function updateVideoRequestStatus(
  id: string,
  status: VideoRequestStatus
): VideoRequestRow | undefined {
  ensureTable();
  db.prepare(
    `UPDATE video_requests SET status = ?, updatedAt = ? WHERE id = ?`
  ).run(status, Date.now(), id);
  return getVideoRequest(id);
}

export function attachLibraryJob(
  id: string,
  libraryJobId: string
): VideoRequestRow | undefined {
  ensureTable();
  db.prepare(
    `UPDATE video_requests SET libraryJobId = ?, status = 'delivered', updatedAt = ? WHERE id = ?`
  ).run(libraryJobId, Date.now(), id);
  return getVideoRequest(id);
}

/** Absolute paths are stored; only allow reading under data/video-requests. */
export function assertRequestAssetPath(filePath: string) {
  const root = path.resolve(requestsRoot());
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Invalid asset path");
  }
  return resolved;
}
