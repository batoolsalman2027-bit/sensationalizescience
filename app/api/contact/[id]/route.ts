import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/operator";
import {
  getContactSubmission,
  updateContactSubmission,
  type ContactStatus,
} from "@/lib/contact-submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: ContactStatus[] = ["new", "in_progress", "resolved"];

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const row = getContactSubmission(ctx.params.id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ submission: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    internalNotes?: string | null;
  };

  const patch: { status?: ContactStatus; internalNotes?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as ContactStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status as ContactStatus;
  }
  if (body.internalNotes !== undefined) {
    patch.internalNotes = body.internalNotes;
  }

  const updated = updateContactSubmission(ctx.params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ submission: updated });
}
