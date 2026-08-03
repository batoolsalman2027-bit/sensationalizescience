import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";

const COOKIE = "synapse_session";
const VISITOR_COOKIE = "synapse_visitor";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Dev fallback — set AUTH_SECRET in production.
    return new TextEncoder().encode("dev-synapse-auth-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string;
  credits: number;
  freeUsed: boolean;
};

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  credits: number;
  freeUsed: number;
  stripeCustomerId: string | null;
  createdAt: number;
};

let userColsEnsured = false;
function ensureUserColumns() {
  if (userColsEnsured) return;
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "freeUsed")) {
    db.exec(`ALTER TABLE users ADD COLUMN freeUsed INTEGER NOT NULL DEFAULT 0`);
  }
  userColsEnsured = true;
}

export function findUserByEmail(email: string): UserRow | undefined {
  ensureUserColumns();
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase()) as
    | UserRow
    | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  ensureUserColumns();
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function createUser(email: string, password: string): UserRow {
  ensureUserColumns();
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, passwordHash, credits, freeUsed, stripeCustomerId, createdAt)
     VALUES (?, ?, ?, 0, 0, NULL, ?)`
  ).run(id, email.toLowerCase(), passwordHash, createdAt);
  return findUserById(id)!;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export async function createSessionCookie(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = typeof payload.sub === "string" ? payload.sub : null;
    if (!id) return null;
    const user = findUserById(id);
    if (!user) return null;
    return { id: user.id, email: user.email, credits: user.credits, freeUsed: Boolean(user.freeUsed) };
  } catch {
    return null;
  }
}

/** Stable anonymous visitor id (1 free video). */
export function getOrCreateVisitorId(): string {
  const existing = cookies().get(VISITOR_COOKIE)?.value;
  if (existing) {
    ensureVisitorRow(existing);
    return existing;
  }
  const id = randomUUID();
  ensureVisitorRow(id);
  cookies().set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

function ensureVisitorRow(id: string) {
  const row = db.prepare(`SELECT id FROM visitors WHERE id = ?`).get(id);
  if (!row) {
    db.prepare(`INSERT INTO visitors (id, freeUsed, createdAt) VALUES (?, 0, ?)`).run(
      id,
      Date.now()
    );
  }
}

export function setUserStripeCustomer(userId: string, customerId: string) {
  db.prepare(`UPDATE users SET stripeCustomerId = ? WHERE id = ?`).run(customerId, userId);
}

export function addCredits(userId: string, delta: number, reason: string) {
  db.prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`).run(delta, userId);
  db.prepare(
    `INSERT INTO credit_ledger (id, userId, visitorId, delta, reason, createdAt)
     VALUES (?, ?, NULL, ?, ?, ?)`
  ).run(randomUUID(), userId, delta, reason, Date.now());
}

export function spendUserCredit(
  userId: string,
  reason = "video_request"
): boolean {
  ensureUserColumns();
  const user = findUserById(userId);
  if (!user || user.credits < 1) return false;
  db.prepare(`UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1`).run(userId);
  db.prepare(
    `INSERT INTO credit_ledger (id, userId, visitorId, delta, reason, createdAt)
     VALUES (?, ?, NULL, -1, ?, ?)`
  ).run(randomUUID(), userId, reason, Date.now());
  return true;
}

/** Mark the account's one free production request as used. */
export function markUserFreeUsed(userId: string) {
  ensureUserColumns();
  db.prepare(`UPDATE users SET freeUsed = 1 WHERE id = ?`).run(userId);
  db.prepare(
    `INSERT INTO credit_ledger (id, userId, visitorId, delta, reason, createdAt)
     VALUES (?, ?, NULL, -1, ?, ?)`
  ).run(randomUUID(), userId, "free_request", Date.now());
}
