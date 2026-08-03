import { NextRequest, NextResponse } from "next/server";
import { findUserById, getSessionUser, setUserStripeCustomer } from "@/lib/auth";
import {
  getPack,
  getStripePackPriceId,
  isPaidPackId,
} from "@/config/pricing";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type Body = {
  /** Paid credit pack id: single | starter | lab | department */
  pack?: string;
  /** @deprecated Prefer `pack`. Still accepted for older clients. */
  plan?: string;
};

/** Enable only after Tax head-office address is set in Stripe Dashboard. */
function taxOptions() {
  if (process.env.STRIPE_AUTOMATIC_TAX !== "true") return {};
  return {
    automatic_tax: { enabled: true as const },
    customer_update: { address: "auto" as const },
  };
}

/**
 * Create a Stripe Checkout Session for a one-time credit-pack payment
 * (Checkout mode=payment). Returns { url } for the browser redirect.
 *
 * Blueprint: Accept a one-time payment with Checkout.
 * Requires an authenticated user; persists stripeCustomerId on the user.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Sign up or log in first" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const packId = body.pack ?? body.plan ?? "";

    if (!isPaidPackId(packId)) {
      return NextResponse.json(
        { error: "Unknown credit pack. Choose single, starter, lab, or department." },
        { status: 400 }
      );
    }

    const pack = getPack(packId)!;
    const priceId = getStripePackPriceId(packId);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe is not configured for the ${pack.name} pack. Set ${pack.stripePriceEnv} in .env (from Dashboard or scripts/stripe-ensure-packs.ts).`,
        },
        { status: 503 }
      );
    }

    if (pack.credits === null || pack.credits <= 0) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const stripe = getStripe();
    const user = findUserById(sessionUser.id)!;

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      setUserStripeCustomer(user.id, customerId);
    }

    const appUrl = getAppUrl();
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      ...taxOptions(),
      success_url: `${appUrl}/create?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/create?checkout=cancel`,
      metadata: {
        userId: user.id,
        pack: packId,
        credits: String(pack.credits),
        kind: "credit_pack",
      },
      payment_intent_data: {
        metadata: {
          userId: user.id,
          pack: packId,
          credits: String(pack.credits),
          kind: "credit_pack",
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Checkout Session missing URL" }, { status: 500 });
    }

    return NextResponse.json({
      url: checkout.url,
      sessionId: checkout.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[/api/billing/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
