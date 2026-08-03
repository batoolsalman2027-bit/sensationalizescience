import { randomUUID } from "crypto";
import { db } from "./db";
import {
  getOrCreateVisitorId,
  getSessionUser,
  markUserFreeUsed,
  spendUserCredit,
  type SessionUser,
} from "./auth";

/** Display label for UI when credits are depleted. */
export const CREDIT_PACK_LABEL =
  process.env.STRIPE_CREDIT_PACK_LABEL ?? "Credit packs from $100";

/** @deprecated Prefer pack-specific credits from config/pricing. */
export const CREDITS_PER_PACK = Number(process.env.STRIPE_CREDITS_PER_PACK ?? 5);

/** Emails that can generate without spending credits (testers / owner). */
function unlimitedEmails(): Set<string> {
  // Lazy require avoids a hard cycle at module load (seed-testers is pure).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unlimitedTesterEmails } = require("./seed-testers") as typeof import("./seed-testers");
  return new Set(unlimitedTesterEmails());
}

export function isUnlimitedUser(user: SessionUser | null | undefined): boolean {
  return Boolean(user && unlimitedEmails().has(user.email.toLowerCase()));
}

export type Entitlement =
  | {
      ok: true;
      mode: "free" | "credit" | "unlimited";
      user: SessionUser | null;
      visitorId: string;
    }
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
 * Can this requester start a production request (or legacy auto-render)?
 * - Unlimited test emails → never blocked
 * - Logged-in with credits → spend a credit
 * - Logged-in with free request unused → one free request on the account
 * - Anonymous with visitor free unused → legacy free (Uploader /api/video)
 * - Otherwise paywall
 */
export async function checkCanGenerate(): Promise<Entitlement> {
  const user = await getSessionUser();
  const visitorId = getOrCreateVisitorId();

  if (isUnlimitedUser(user)) {
    return { ok: true, mode: "unlimited", user, visitorId };
  }

  if (user && user.credits >= 1) {
    return { ok: true, mode: "credit", user, visitorId };
  }

  // Account-scoped free request (Create / signed-in product path)
  if (user && !user.freeUsed) {
    return { ok: true, mode: "free", user, visitorId };
  }

  // Legacy anonymous free (visitor cookie) — only when not signed in
  if (!user && !visitorFreeUsed(visitorId)) {
    return { ok: true, mode: "free", user: null, visitorId };
  }

  if (user) {
    return {
      ok: false,
      code: "PAYWALL",
      message:
        "You've used your free request. Buy credits to submit another production request.",
      visitorId,
      user,
    };
  }

  return {
    ok: false,
    code: "PAYWALL",
    message:
      "You've used your free video. Create an account and buy credits to request more.",
    visitorId,
    user: null,
  };
}

/** Call after a production request (or legacy render) is successfully accepted. */
export function consumeEntitlement(ent: Extract<Entitlement, { ok: true }>) {
  if (ent.mode === "unlimited") return;
  if (ent.mode === "free") {
    if (ent.user) {
      markUserFreeUsed(ent.user.id);
      return;
    }
    markVisitorFreeUsed(ent.visitorId);
    return;
  }
  if (ent.user) {
    spendUserCredit(ent.user.id, "video_request");
  }
}

export async function getBillingStatus() {
  const user = await getSessionUser();
  const visitorId = getOrCreateVisitorId();
  const unlimited = isUnlimitedUser(user);
  const freeUsed = user
    ? Boolean(user.freeUsed)
    : visitorFreeUsed(visitorId);
  const credits = unlimited ? 999999 : user?.credits ?? 0;
  const canGenerate = Boolean(
    unlimited || credits >= 1 || (user ? !user.freeUsed : !freeUsed)
  );
  return {
    authenticated: Boolean(user),
    email: user?.email ?? null,
    credits,
    freeUsed,
    unlimited,
    canGenerate,
    packLabel: CREDIT_PACK_LABEL,
  };
}
