import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Anchored on globalThis so Next.js dev's per-route module bundling (each API
// route otherwise gets its own copy of this module) doesn't open the file
// more than once per process.
const globalForDb = globalThis as unknown as { __paper2videoDb?: Database.Database };

function openDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "jobs.db"));
  db.pragma("journal_mode = WAL");
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

export const db = globalForDb.__paper2videoDb ?? (globalForDb.__paper2videoDb = openDb());
