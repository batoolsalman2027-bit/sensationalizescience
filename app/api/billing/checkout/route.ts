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
 * Start Stripe Checkout for a one-time credit pack.
 * Requires an authenticated user.
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
          error: `Stripe is not configured for the ${pack.name} pack. Set ${pack.stripePriceEnv} in .env.`,
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

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...taxOptions(),
      success_url: `${getAppUrl()}/create?checkout=success`,
      cancel_url: `${getAppUrl()}/create?checkout=cancel`,
      metadata: {
        userId: user.id,
        pack: packId,
        credits: String(pack.credits),
        kind: "credit_pack",
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[/api/billing/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
