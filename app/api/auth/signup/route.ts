import { NextRequest, NextResponse } from "next/server";
import { createUser, createSessionCookie, findUserByEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

    const user = createUser(email, password);
    await createSessionCookie(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, credits: user.credits },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Signup failed" }, { status: 500 });
  }
}
