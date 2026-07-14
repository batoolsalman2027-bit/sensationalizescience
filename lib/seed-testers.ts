import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

/**
 * Ensure every email in UNLIMITED_TEST_EMAILS exists with UNLIMITED_TEST_PASSWORD.
 * Unlimited billing is email-based; without a user row, login fails and the
 * tester path never activates.
 */
export function ensureUnlimitedTesterAccounts(db: Database.Database) {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const emails = (process.env.UNLIMITED_TEST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return;

  const password = process.env.UNLIMITED_TEST_PASSWORD?.trim() || "SynapseTest2026!";
  if (password.length < 8) {
    console.warn("[seed-testers] UNLIMITED_TEST_PASSWORD must be at least 8 characters");
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const find = db.prepare(`SELECT id FROM users WHERE email = ?`);
  const insert = db.prepare(
    `INSERT INTO users (id, email, passwordHash, credits, stripeCustomerId, createdAt)
     VALUES (?, ?, ?, 0, NULL, ?)`
  );
  const update = db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`);

  for (const email of emails) {
    const row = find.get(email) as { id: string } | undefined;
    if (!row) {
      insert.run(randomUUID(), email, passwordHash, Date.now());
      console.log(`[seed-testers] created unlimited tester ${email}`);
    } else {
      // Keep the documented tester password in sync across deploys.
      update.run(passwordHash, row.id);
    }
  }
}
