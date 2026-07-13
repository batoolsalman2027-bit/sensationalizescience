import { randomUUID } from "crypto";
import { db } from "./db";
import {
  getOrCreateVisitorId,
  getSessionUser,
  spendUserCredit,
  type SessionUser,
} from "./auth";

/** Credits granted per Stripe pack purchase. */
export const CREDITS_PER_PACK = Number(process.env.STRIPE_CREDITS_PER_PACK ?? 5);
/** Display price for UI (actual charge is the Stripe Price). */
export const CREDIT_PACK_LABEL =
  process.env.STRIPE_CREDIT_PACK_LABEL ?? "$9.99 for 5 videos";

export type Entitlement =
  | { ok: true; mode: "free" | "credit"; user: SessionUser | null; visitorId: string }
  | { ok: false; code: "PAYWALL"; message: string; visitorId: string; user: SessionUser | null };

function visitorFreeUsed(visitorId: string): boolean {
  const row = db.prepare(`SELECT freeUsed FROM visitors WHERE id = ?`).get(visitorId) as
    | { freeUsed: number }
    | undefined;
  return Boolean(row?.freeUsed);
}

export function markVisitorFreeUsed(visitorId: string) {
  db.prepare(`UPDATE visitors SET freeUsed = 1 WHERE id = ?`).run(visitorId);
  db.prepare(
    `INSERT INTO credit_ledger (id, userId, visitorId, delta, reason, createdAt)
     VALUES (?, NULL, ?, -1, ?, ?)`
  ).run(randomUUID(), visitorId, "free_video", Date.now());
}

/**
 * Can this requester start a paid render?
 * - Anonymous / logged-in with free unused → free mode
 * - Logged-in with credits → credit mode
 * - Otherwise paywall
 */
export async function checkCanGenerate(): Promise<Entitlement> {
  const user = await getSessionUser();
  const visitorId = getOrCreateVisitorId();

  if (user && user.credits >= 1) {
    return { ok: true, mode: "credit", user, visitorId };
  }

  if (!visitorFreeUsed(visitorId)) {
    return { ok: true, mode: "free", user, visitorId };
  }

  if (user) {
    return {
      ok: false,
      code: "PAYWALL",
      message: "You're out of video credits. Buy more to keep generating.",
      visitorId,
      user,
    };
  }

  return {
    ok: false,
    code: "PAYWALL",
    message:
      "You've used your free video. Create an account and buy credits to generate more.",
    visitorId,
    user: null,
  };
}

/** Call after a render job is successfully started. */
export function consumeEntitlement(ent: Extract<Entitlement, { ok: true }>) {
  if (ent.mode === "free") {
    markVisitorFreeUsed(ent.visitorId);
    return;
  }
  if (ent.user) {
    spendUserCredit(ent.user.id);
  }
}

export async function getBillingStatus() {
  const user = await getSessionUser();
  const visitorId = getOrCreateVisitorId();
  const freeUsed = visitorFreeUsed(visitorId);
  return {
    authenticated: Boolean(user),
    email: user?.email ?? null,
    credits: user?.credits ?? 0,
    freeUsed,
    canGenerate: Boolean((user && user.credits >= 1) || !freeUsed),
    packLabel: CREDIT_PACK_LABEL,
  };
}
