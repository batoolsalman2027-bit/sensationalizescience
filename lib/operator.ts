import { getSessionUser } from "./auth";

/**
 * Operator inbox is limited to emails listed in OPERATOR_EMAILS
 * (comma-separated). Only those accounts can see /ops and the
 * /api/video-requests list — submissions from every user still land there.
 */
export function operatorEmails(): string[] {
  const raw = process.env.OPERATOR_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireOperator() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, status: 401 as const, error: "Sign in required" };

  const allowed = operatorEmails();
  if (allowed.length === 0) {
    return {
      ok: false as const,
      status: 503 as const,
      error: "OPERATOR_EMAILS is not configured on this server",
    };
  }

  if (!allowed.includes(user.email.toLowerCase())) {
    return { ok: false as const, status: 403 as const, error: "Operator access only" };
  }

  return { ok: true as const, user };
}

export async function isOperatorSession(): Promise<boolean> {
  const result = await requireOperator();
  return result.ok;
}
