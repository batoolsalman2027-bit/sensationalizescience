import Stripe from "stripe";

let stripe: Stripe | null = null;

/**
 * Stripe SDK client. API version is left unset (SDK default) unless a blueprint
 * explicitly requires a pin — see Stripe Dashboard → Developers → API version.
 *
 * Keys: set STRIPE_SECRET_KEY from https://dashboard.stripe.com/apikeys
 * (use sk_test_… locally; sk_live_… only in production).
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — copy from https://dashboard.stripe.com/apikeys into .env"
    );
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
