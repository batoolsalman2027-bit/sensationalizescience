import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/config/pricing";

export const runtime = "nodejs";

function grantOnce(userId: string, credits: number, reason: string) {
  const already = db.prepare(`SELECT id FROM credit_ledger WHERE reason = ?`).get(reason);
  if (already || credits <= 0) return;
  addCredits(userId, credits, reason);
}

/**
 * Stripe webhook — grant video credits after one-time Checkout payment.
 * Legacy subscription renewals remain handled for existing customers.
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe webhook] signature error", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: {
        userId?: string;
        credits?: string;
        kind?: string;
        pack?: string;
        plan?: string;
      };
    };

    if (session.metadata?.kind === "credit_pack" && session.metadata.userId) {
      const pack = session.metadata.pack ? getPack(session.metadata.pack) : undefined;
      const credits = Number(
        session.metadata.credits || (pack?.credits ?? 0)
      );
      grantOnce(session.metadata.userId, credits, `stripe_credit_pack:${session.id}`);
    }

    // Legacy subscription start (existing customers)
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
    };

    if (invoice.billing_reason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    if (
      invoice.billing_reason !== "subscription_cycle" &&
      invoice.billing_reason !== "subscription_update"
    ) {
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

    // Legacy: old Creator/Lab subscription renewals
    const perMonth = Number(sub.metadata?.creditsPerMonth || 0);
    const interval = sub.items.data[0]?.price?.recurring?.interval;
    const credits = interval === "year" ? perMonth * 12 : perMonth;
    grantOnce(userId, credits, `stripe_invoice:${invoice.id}`);
  }

  return NextResponse.json({ received: true });
}
