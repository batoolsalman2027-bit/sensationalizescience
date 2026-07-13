import { NextRequest, NextResponse } from "next/server";
import { findUserById, getSessionUser, setUserStripeCustomer } from "@/lib/auth";
import { CREDITS_PER_PACK } from "@/lib/billing";
import { getPlan, getStripePriceId } from "@/config/pricing";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type Body = {
  /** creator | lab | credits (one-time pack) */
  plan?: string;
  interval?: "month" | "year";
};

/**
 * Start Stripe Checkout for a subscription plan or one-time credit pack.
 * Requires an authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Sign up or log in first" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const planId = body.plan ?? "creator";
    const interval = body.interval === "year" ? "year" : "month";

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

    // One-time credit pack (legacy / optional top-up)
    if (planId === "credits") {
      const priceId = process.env.STRIPE_PRICE_ID_CREDITS;
      if (!priceId) {
        return NextResponse.json(
          { error: "Stripe credit pack is not configured (STRIPE_PRICE_ID_CREDITS)." },
          { status: 503 }
        );
      }
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        success_url: `${getAppUrl()}/create?checkout=success`,
        cancel_url: `${getAppUrl()}/create?checkout=cancel`,
        metadata: {
          userId: user.id,
          credits: String(CREDITS_PER_PACK),
          kind: "credit_pack",
        },
      });
      return NextResponse.json({ url: checkout.url });
    }

    if (planId !== "creator" && planId !== "lab") {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const plan = getPlan(planId)!;
    const priceId = getStripePriceId(planId, interval);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe is not configured for ${plan.name} (${interval}). Set the plan price IDs in .env.`,
        },
        { status: 503 }
      );
    }

    const credits =
      interval === "year"
        ? (plan.creditsPerMonth ?? 0) * 12
        : (plan.creditsPerMonth ?? 0);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      success_url: `${getAppUrl()}/create?checkout=success`,
      cancel_url: `${getAppUrl()}/create?checkout=cancel`,
      metadata: {
        userId: user.id,
        plan: planId,
        credits: String(credits),
        kind: "subscription",
        interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: planId,
          creditsPerMonth: String(plan.creditsPerMonth ?? 0),
        },
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error("[/api/billing/checkout]", err);
    return NextResponse.json({ error: err?.message ?? "Checkout failed" }, { status: 500 });
  }
}
