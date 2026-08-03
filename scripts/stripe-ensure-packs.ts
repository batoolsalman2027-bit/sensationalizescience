/**
 * Ensure one-time credit-pack Products + Prices exist in the Stripe account
 * pointed at by STRIPE_SECRET_KEY (test or live). Prints price IDs only —
 * never the secret key.
 *
 * Usage: npx tsx scripts/stripe-ensure-packs.ts
 * Or:    node --import tsx scripts/stripe-ensure-packs.ts
 *
 * Get keys from: https://dashboard.stripe.com/apikeys
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import Stripe from "stripe";

function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const PACKS = [
  {
    pack: "single",
    name: "Sensationalize Science — Single (1 credit)",
    credits: 1,
    unitAmount: 100_00,
    envKey: "STRIPE_PRICE_ID_PACK_SINGLE",
  },
  {
    pack: "starter",
    name: "Sensationalize Science — Starter (5 credits)",
    credits: 5,
    unitAmount: 450_00,
    envKey: "STRIPE_PRICE_ID_PACK_STARTER",
  },
  {
    pack: "lab",
    name: "Sensationalize Science — Lab (15 credits)",
    credits: 15,
    unitAmount: 1200_00,
    envKey: "STRIPE_PRICE_ID_PACK_LAB",
  },
  {
    pack: "department",
    name: "Sensationalize Science — Department (40 credits)",
    credits: 40,
    unitAmount: 2800_00,
    envKey: "STRIPE_PRICE_ID_PACK_DEPARTMENT",
  },
] as const;

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is missing. Copy .env.example → .env and paste keys from https://dashboard.stripe.com/apikeys"
    );
    process.exit(1);
  }

  // Blueprint: leave API version unset unless specified.
  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live") ? "live" : "test";
  console.log(`Stripe mode: ${mode}`);

  const existing = await stripe.products.list({ limit: 100, active: true });
  const byPack = new Map<string, Stripe.Product>();
  for (const p of existing.data) {
    if (p.metadata?.pack) byPack.set(p.metadata.pack, p);
  }

  const results: Record<string, string> = {};

  for (const def of PACKS) {
    let product = byPack.get(def.pack);
    let priceId: string | null = null;

    if (product?.default_price) {
      priceId =
        typeof product.default_price === "string"
          ? product.default_price
          : product.default_price.id;
    }

    if (!product) {
      product = await stripe.products.create({
        name: def.name,
        description: `${def.credits} finished video credit${def.credits === 1 ? "" : "s"}. Does not expire.`,
        metadata: { pack: def.pack, credits: String(def.credits) },
        default_price_data: {
          currency: "usd",
          unit_amount: def.unitAmount,
        },
      });
      priceId =
        typeof product.default_price === "string"
          ? product.default_price
          : product.default_price?.id ?? null;
      console.log(`Created product ${def.pack}: ${product.id}`);
    } else if (!priceId) {
      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: def.unitAmount,
      });
      await stripe.products.update(product.id, { default_price: price.id });
      priceId = price.id;
      console.log(`Created price for existing product ${def.pack}: ${price.id}`);
    } else {
      console.log(`Reusing ${def.pack}: ${priceId}`);
    }

    if (!priceId) throw new Error(`No price for pack ${def.pack}`);
    results[def.envKey] = priceId;
  }

  console.log("\nAdd these to .env / Railway (never commit real secrets):\n");
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}=${v}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
