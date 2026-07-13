import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  const status = await getBillingStatus();
  return NextResponse.json(status);
}
