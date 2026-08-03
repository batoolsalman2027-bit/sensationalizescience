import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { addCredits } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/config/pricing";

export const runtime = "nodejs";

function grantOnce(userId: string, credits: number, reason: string) {
  const already = db.prepare(`SELECT id FROM credit_ledger WHERE reason = ?`).get(reason);
  if (already || credits <= 0) return false;
  addCredits(userId, credits, reason);
  return true;
}

function grantCreditPack(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "credit_pack") return;

  const userId = meta.userId || session.client_reference_id;
  if (!userId) {
    console.warn("[stripe webhook] credit_pack session missing userId", session.id);
    return;
  }

  // One-time Checkout: only grant when payment succeeded.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    console.warn(
      "[stripe webhook] checkout.session.completed not paid yet",
      session.id,
      session.payment_status
    );
    return;
  }

  const pack = meta.pack ? getPack(meta.pack) : undefined;
  const credits = Number(meta.credits || (pack?.credits ?? 0));
  const granted = grantOnce(userId, credits, `stripe_credit_pack:${session.id}`);
  if (granted) {
    console.log(`[stripe webhook] granted ${credits} credits to ${userId} (${session.id})`);
  }
}

/**
 * Stripe webhook — confirm one-time Checkout payments and grant credits.
 * Listens for checkout.session.completed (blueprint: Handle webhook events).
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe webhook] signature error", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    grantCreditPack(session);

    // Legacy subscription start (existing customers)
    if (session.metadata?.kind === "subscription" && session.metadata.userId) {
      const credits = Number(session.metadata.credits || 0);
      grantOnce(session.metadata.userId, credits, `stripe_sub_start:${session.id}`);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const billingReason = invoice.billing_reason;

    if (billingReason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    if (billingReason !== "subscription_cycle" && billingReason !== "subscription_update") {
      return NextResponse.json({ received: true });
    }

    const invoiceSub = (
      invoice as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      }
    ).subscription;
    const subId =
      typeof invoiceSub === "string" ? invoiceSub : invoiceSub?.id;

    if (!subId) return NextResponse.json({ received: true });

    const sub = await stripe.subscriptions.retrieve(subId);
    const userId = sub.metadata?.userId;
    const planId = sub.metadata?.plan;
    if (!userId || !planId) return NextResponse.json({ received: true });

    const perMonth = Number(sub.metadata?.creditsPerMonth || 0);
    const interval = sub.items.data[0]?.price?.recurring?.interval;
    const credits = interval === "year" ? perMonth * 12 : perMonth;
    grantOnce(userId, credits, `stripe_invoice:${invoice.id}`);
  }

  return NextResponse.json({ received: true });
}
