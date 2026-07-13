import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Anchored on globalThis so Next.js dev's per-route module bundling (each API
// route otherwise gets its own copy of this module) doesn't open the file
// more than once per process.
const globalForDb = globalThis as unknown as { __paper2videoDb?: Database.Database };

function openDb(): Database.Database {
  // During `next build`, Next may evaluate routes in parallel. Use an
  // in-memory DB so we never hit a locked on-disk file (SQLITE_BUSY).
  if (process.env.NEXT_PHASE === "phase-production-build") {
    const mem = new Database(":memory:");
    mem.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        videoUrl TEXT,
        error TEXT,
        createdAt INTEGER NOT NULL
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
    `);
    return mem;
  }

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "jobs.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      videoUrl TEXT,
      error TEXT,
      createdAt INTEGER NOT NULL
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
  `);
  return db;
}

function getDb(): Database.Database {
  if (!globalForDb.__paper2videoDb) {
    globalForDb.__paper2videoDb = openDb();
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
