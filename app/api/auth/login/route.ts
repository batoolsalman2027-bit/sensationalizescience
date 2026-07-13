import { NextRequest, NextResponse } from "next/server";
import {
  createSessionCookie,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(user, password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSessionCookie(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, credits: user.credits },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Login failed" }, { status: 500 });
  }
}
