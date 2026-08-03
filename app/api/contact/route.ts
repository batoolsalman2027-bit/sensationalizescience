import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireOperator } from "@/lib/operator";
import {
  countNewContactSubmissions,
  createContactSubmission,
  listContactSubmissions,
} from "@/lib/contact-submissions";
import { CONTACT_SUBJECTS, type ContactSubjectId } from "@/config/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE = 20;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

/** Simple in-memory rate limit by IP (resets on process restart — fine for single instance). */
const hits = new Map<string, number[]>();

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

function isSubject(v: string): v is ContactSubjectId {
  return CONTACT_SUBJECTS.some((s) => s.id === v);
}

/** GET — operator inbox of contact submissions. */
export async function GET() {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const submissions = listContactSubmissions().map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    subject: s.subject,
    message: s.message,
    status: s.status,
    userId: s.userId,
    internalNotes: s.internalNotes,
    createdAt: s.createdAt,
    resolvedAt: s.resolvedAt,
  }));

  return NextResponse.json({
    submissions,
    newCount: countNewContactSubmissions(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(clientKey(req))) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      /** Honeypot — bots fill this; humans leave it empty. */
      website?: string;
    };

    // Honeypot: pretend success so bots don't retry smarter.
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();

    if (name.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    if (!isSubject(subject)) {
      return NextResponse.json({ error: "Please choose a subject." }, { status: 400 });
    }
    if (message.length < MIN_MESSAGE) {
      return NextResponse.json(
        { error: `Message must be at least ${MIN_MESSAGE} characters.` },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    const row = createContactSubmission({
      name,
      email,
      subject,
      message,
      userId: user?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      email: row.email,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not send message";
    console.error("[/api/contact]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
