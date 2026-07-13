import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { CREDITS_PER_PACK } from "@/lib/billing";
import { getPlan } from "@/config/pricing";

export const runtime = "nodejs";

function grantOnce(userId: string, credits: number, reason: string) {
  const already = db.prepare(`SELECT id FROM credit_ledger WHERE reason = ?`).get(reason);
  if (already || credits <= 0) return;
  addCredits(userId, credits, reason);
}

/**
 * Stripe webhook — grant video credits after Checkout / invoice payment.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] signature error", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      mode?: string;
      metadata?: {
        userId?: string;
        credits?: string;
        kind?: string;
        plan?: string;
        interval?: string;
      };
    };

    if (session.metadata?.kind === "credit_pack" && session.metadata.userId) {
      const credits = Number(session.metadata.credits || CREDITS_PER_PACK);
      grantOnce(session.metadata.userId, credits, `stripe_credit_pack:${session.id}`);
    }

    // First subscription invoice may also fire invoice.paid — we grant on checkout
    // for immediate credit, and use invoice.paid only for renewals.
    if (session.metadata?.kind === "subscription" && session.metadata.userId) {
      const credits = Number(session.metadata.credits || 0);
      grantOnce(session.metadata.userId, credits, `stripe_sub_start:${session.id}`);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as {
      id: string;
      billing_reason?: string | null;
      subscription?: string | { id: string } | null;
      lines?: { data?: Array<{ price?: { id?: string; metadata?: Record<string, string> } }> };
    };

    // Skip the first invoice — already handled via checkout.session.completed.
    if (invoice.billing_reason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription_update") {
      return NextResponse.json({ received: true });
    }

    const subId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!subId) return NextResponse.json({ received: true });

    const sub = await stripe.subscriptions.retrieve(subId);
    const userId = sub.metadata?.userId;
    const planId = sub.metadata?.plan;
    if (!userId || !planId) return NextResponse.json({ received: true });

    const plan = getPlan(planId);
    const perMonth = Number(sub.metadata?.creditsPerMonth || plan?.creditsPerMonth || 0);
    const interval = sub.items.data[0]?.price?.recurring?.interval;
    const credits = interval === "year" ? perMonth * 12 : perMonth;
    grantOnce(userId, credits, `stripe_invoice:${invoice.id}`);
  }

  return NextResponse.json({ received: true });
}
