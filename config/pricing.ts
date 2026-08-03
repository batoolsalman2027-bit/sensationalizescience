/**
 * Credit packs — single source of truth for pricing UI and Stripe checkout.
 * 1 credit = 1 finished video. Base list price drives per-video and % off.
 */

export const CREDIT_BASE_PRICE_USD = 100;

export type CreditPackId =
  | "try"
  | "single"
  | "starter"
  | "lab"
  | "department"
  | "custom";

export type ContactSubjectId =
  | "bug"
  | "billing"
  | "bulk_credits"
  | "academic"
  | "other";

export interface CreditPack {
  id: CreditPackId;
  name: string;
  blurb: string;
  /** Credits granted; null = custom / contact sales. */
  credits: number | null;
  /** Total price in USD; 0 = free; null = contact. */
  priceUsd: number | null;
  cta: { label: string; href: string };
  /** Visual badge on the card (e.g. Most popular). */
  badge?: string;
  featured?: boolean;
  /** Env var holding the Stripe one-time Price ID (paid packs only). */
  stripePriceEnv?: string;
}

/**
 * Paid packs only — used by checkout + webhook.
 * Per-video and discount % are derived from CREDIT_BASE_PRICE_USD.
 */
const PAID_PACK_DEFS: Array<{
  id: Exclude<CreditPackId, "try" | "custom">;
  name: string;
  blurb: string;
  credits: number;
  priceUsd: number;
  badge?: string;
  featured?: boolean;
  ctaLabel: string;
  stripePriceEnv: string;
}> = [
  {
    id: "single",
    name: "Single",
    blurb: "One publication-quality video.",
    credits: 1,
    priceUsd: 100,
    ctaLabel: "Buy 1 credit",
    stripePriceEnv: "STRIPE_PRICE_ID_PACK_SINGLE",
  },
  {
    id: "starter",
    name: "Starter",
    blurb: "A few papers, one lab.",
    credits: 5,
    priceUsd: 450,
    ctaLabel: "Buy Starter",
    stripePriceEnv: "STRIPE_PRICE_ID_PACK_STARTER",
  },
  {
    id: "lab",
    name: "Lab",
    blurb: "For active research groups.",
    credits: 15,
    priceUsd: 1200,
    badge: "Most popular",
    featured: true,
    ctaLabel: "Buy Lab pack",
    stripePriceEnv: "STRIPE_PRICE_ID_PACK_LAB",
  },
  {
    id: "department",
    name: "Department",
    blurb: "For departments and institutes.",
    credits: 40,
    priceUsd: 2800,
    badge: "Best value",
    ctaLabel: "Buy Department pack",
    stripePriceEnv: "STRIPE_PRICE_ID_PACK_DEPARTMENT",
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "try",
    name: "Try it",
    blurb: "No risk — see the quality first.",
    credits: 1,
    priceUsd: 0,
    cta: { label: "Start free", href: "/create" },
  },
  ...PAID_PACK_DEFS.map((p) => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    credits: p.credits,
    priceUsd: p.priceUsd,
    badge: p.badge,
    featured: p.featured,
    stripePriceEnv: p.stripePriceEnv,
    cta: {
      label: p.ctaLabel,
      href: `/signup?pack=${p.id}&next=/create`,
    },
  })),
  {
    id: "custom",
    name: "Custom",
    blurb: "50+ credits with tailored terms.",
    credits: null,
    priceUsd: null,
    cta: {
      label: "Contact us",
      href: "/resources/contact?subject=bulk_credits",
    },
  },
];

export function getPack(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === packId);
}

export function isPaidPackId(
  id: string
): id is Exclude<CreditPackId, "try" | "custom"> {
  return PAID_PACK_DEFS.some((p) => p.id === id);
}

/** Resolve Stripe one-time Price ID for a paid pack. */
export function getStripePackPriceId(packId: string): string | null {
  const pack = getPack(packId);
  if (!pack?.stripePriceEnv) return null;
  return process.env[pack.stripePriceEnv] || null;
}

/** Per-video effective price; null when free or custom. */
export function packPerVideoUsd(pack: CreditPack): number | null {
  if (pack.priceUsd === null || pack.credits === null || pack.credits <= 0) return null;
  if (pack.priceUsd === 0) return 0;
  return pack.priceUsd / pack.credits;
}

/** Percent off vs base list price; null when no discount or N/A. */
export function packDiscountPercent(pack: CreditPack): number | null {
  const per = packPerVideoUsd(pack);
  if (per === null || per <= 0 || pack.priceUsd === 0) return null;
  const pct = Math.round((1 - per / CREDIT_BASE_PRICE_USD) * 100);
  return pct > 0 ? pct : null;
}

/** Format money for display. */
export function formatUsd(amount: number): string {
  return amount % 1 === 0
    ? `$${amount.toLocaleString("en-US")}`
    : `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Features every finished credit unlocks (no longer tiered). */
export const CREDIT_INCLUDES: string[] = [
  "No watermark",
  "Premium AI voices",
  "1080p export",
  "All platform formats (16:9, 9:16, 1:1)",
  "Captions",
  "Full ownership of the finished video",
];

/** Higher-touch capabilities — route to contact rather than tier perks. */
export const CREDIT_CONTACT_FEATURES: string[] = [
  "4K export",
  "API access",
  "Team workspace",
  "SSO & security controls",
];

export const CONTACT_SUBJECTS: { id: ContactSubjectId; label: string }[] = [
  { id: "bug", label: "Bug / Quality issue" },
  { id: "billing", label: "Billing" },
  { id: "bulk_credits", label: "Bulk credits" },
  { id: "academic", label: "Academic pricing" },
  { id: "other", label: "Other" },
];

export const PRICING_FAQ = [
  {
    q: "How do credits work?",
    a: "One credit equals one finished video delivered to your library. Credits do not expire — buy a pack and use them when you need them.",
  },
  {
    q: "What counts as a video?",
    a: "Each finished video published to your library uses one credit. If something came out wrong, contact us and the production team will work with you on revisions.",
  },
  {
    q: "Do you offer academic discounts?",
    a: "Yes. Students and verified academic labs qualify for reduced pricing. Use the contact form and choose Academic pricing.",
  },
  {
    q: "Do credits expire?",
    a: "No. Credits stay on your account until you use them.",
  },
];

/** @deprecated Use getPack / CREDIT_PACKS. Kept briefly for any stray imports. */
export function getPlan(planId: string) {
  return getPack(planId);
}
