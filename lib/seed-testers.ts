import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

type TesterAccount = { email: string; password: string };

/**
 * Parse unlimited accounts from env.
 *
 * Preferred: UNLIMITED_TEST_ACCOUNTS=email:password,email2:password2
 * Legacy:    UNLIMITED_TEST_EMAILS + UNLIMITED_TEST_PASSWORD
 */
export function parseUnlimitedTesterAccounts(): TesterAccount[] {
  const accounts: TesterAccount[] = [];
  const seen = new Set<string>();

  const paired = process.env.UNLIMITED_TEST_ACCOUNTS ?? "";
  for (const part of paired.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const email = trimmed.slice(0, colon).trim().toLowerCase();
    const password = trimmed.slice(colon + 1);
    if (!email || !password || password.length < 8) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    accounts.push({ email, password });
  }

  const legacyPassword =
    process.env.UNLIMITED_TEST_PASSWORD?.trim() || "SynapseTest2026!";
  for (const email of (process.env.UNLIMITED_TEST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)) {
    if (seen.has(email)) continue;
    if (legacyPassword.length < 8) continue;
    seen.add(email);
    accounts.push({ email, password: legacyPassword });
  }

  return accounts;
}

/** Emails that receive unlimited generation (used by billing). */
export function unlimitedTesterEmails(): string[] {
  return parseUnlimitedTesterAccounts().map((a) => a.email);
}

/**
 * Ensure every unlimited tester email exists with the configured password.
 * Unlimited billing is email-based; without a user row, login fails.
 */
export function ensureUnlimitedTesterAccounts(db: Database.Database) {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const accounts = parseUnlimitedTesterAccounts();
  if (accounts.length === 0) return;

  const find = db.prepare(`SELECT id FROM users WHERE email = ?`);
  const insert = db.prepare(
    `INSERT INTO users (id, email, passwordHash, credits, stripeCustomerId, createdAt)
     VALUES (?, ?, ?, 0, NULL, ?)`
  );
  const update = db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`);

  for (const { email, password } of accounts) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const row = find.get(email) as { id: string } | undefined;
    if (!row) {
      insert.run(randomUUID(), email, passwordHash, Date.now());
      console.log(`[seed-testers] created unlimited tester ${email}`);
    } else {
      // Keep configured tester passwords in sync across deploys.
      update.run(passwordHash, row.id);
    }
  }
}
