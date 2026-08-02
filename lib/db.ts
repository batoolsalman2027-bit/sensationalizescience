import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Anchored on globalThis so Next.js dev's per-route module bundling (each API
// route otherwise gets its own copy of this module) doesn't open the file
// more than once per process.
const globalForDb = globalThis as unknown as { __paper2videoDb?: Database.Database };

/**
 * One schema definition for both the on-disk and in-memory databases. These
 * were previously duplicated, which meant any new table had to be added twice
 * or the build-phase database would silently diverge from the real one.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    videoUrl TEXT,
    error TEXT,
    createdAt INTEGER NOT NULL,
    userId TEXT,
    title TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    stripeCustomerId TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    freeUsed INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_ledger (
    id TEXT PRIMARY KEY,
    userId TEXT,
    visitorId TEXT,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  -- ---- scientific figure pipeline ----

  -- A production project: one paper moving through the workflow.
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT,
    status TEXT NOT NULL,
    paperTitle TEXT,
    paperDoi TEXT,
    paperAuthors TEXT,
    paperJournal TEXT,
    sourceFileName TEXT,
    narrative TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  -- Figures extracted from the paper, with analysis, scores, and decision.
  -- analysisJson / dataJson / scoresJson hold the typed structures from
  -- lib/figures/types.ts; they are read back through typed accessors.
  CREATE TABLE IF NOT EXISTS figures (
    id TEXT NOT NULL,
    projectId TEXT NOT NULL,
    figureNumber TEXT,
    caption TEXT NOT NULL,
    section TEXT,
    referenceContext TEXT,
    boundsJson TEXT NOT NULL,
    assetPath TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    analysisJson TEXT,
    dataJson TEXT,
    scoresJson TEXT,
    recreationMethod TEXT,
    exclusionReason TEXT,
    recommended INTEGER NOT NULL DEFAULT 0,
    decision TEXT NOT NULL DEFAULT 'pending',
    createdAt INTEGER NOT NULL,
    PRIMARY KEY (projectId, id)
  );

  -- Provenance for every visual produced from a figure.
  CREATE TABLE IF NOT EXISTS visual_provenance (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    figureId TEXT,
    paperTitle TEXT,
    paperDoi TEXT,
    originalFigureNumber TEXT,
    originalCaption TEXT,
    paperSection TEXT,
    method TEXT NOT NULL,
    dataSource TEXT,
    generatorModel TEXT,
    generatorPrompt TEXT,
    approvalStatus TEXT NOT NULL DEFAULT 'pending',
    approvedBy TEXT,
    approvedAt INTEGER,
    createdAt INTEGER NOT NULL
  );

  -- Append-only audit trail. Never updated or deleted.
  CREATE TABLE IF NOT EXISTS review_events (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    figureId TEXT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    detail TEXT,
    createdAt INTEGER NOT NULL
  );

  -- Production requests from /create — operator fulfills these manually.
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

  CREATE INDEX IF NOT EXISTS idx_figures_project ON figures (projectId);
  CREATE INDEX IF NOT EXISTS idx_provenance_project ON visual_provenance (projectId);
  CREATE INDEX IF NOT EXISTS idx_review_project ON review_events (projectId, createdAt);
  CREATE INDEX IF NOT EXISTS idx_video_requests_created ON video_requests (createdAt DESC);
`;

function openDb(): Database.Database {
  // During `next build`, Next may evaluate routes in parallel. Use an
  // in-memory DB so we never hit a locked on-disk file (SQLITE_BUSY).
  if (process.env.NEXT_PHASE === "phase-production-build") {
    const mem = new Database(":memory:");
    mem.exec(SCHEMA);
    return mem;
  }

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "jobs.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

function getDb(): Database.Database {
  if (!globalForDb.__paper2videoDb) {
    const opened = openDb();
    globalForDb.__paper2videoDb = opened;
    // Lazy import avoids pulling bcrypt into the build-phase path unnecessarily.
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ensureUnlimitedTesterAccounts } = require("./seed-testers") as typeof import("./seed-testers");
      try {
        ensureUnlimitedTesterAccounts(opened);
      } catch (err) {
        console.warn("[db] failed to seed unlimited testers:", err);
      }
    }
  }
  return globalForDb.__paper2videoDb;
}

/** Lazy proxy — never opens SQLite until a query actually runs. */
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop, _receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
