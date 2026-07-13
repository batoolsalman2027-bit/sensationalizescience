/**
 * Pricing data. Stripe Price IDs are set via env (sandbox defaults below).
 */

export interface PricingPlan {
  id: string;
  name: string;
  blurb: string;
  /** Placeholder prices in USD. Use null for "custom". */
  monthly: number | null;
  yearly: number | null; // per-month price when billed yearly
  cta: { label: string; href: string };
  featured?: boolean;
  features: string[];
  /** Videos granted per billing month (subscriptions). */
  creditsPerMonth?: number;
  /** Stripe recurring price IDs — monthly / yearly. */
  stripePriceEnv?: { monthly: string; yearly: string };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    blurb: "Try it on your next paper.",
    monthly: 0,
    yearly: 0,
    cta: { label: "Get Started", href: "/create" },
    features: ["1 free video, no risk to try"],
  },
  {
    id: "creator",
    name: "Creator",
    blurb: "For individual science creators.",
    monthly: 19,
    yearly: 15,
    cta: { label: "Start Creator", href: "/signup?plan=creator&interval=month&next=/create" },
    featured: true,
    creditsPerMonth: 30,
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_ID_CREATOR_MONTHLY",
      yearly: "STRIPE_PRICE_ID_CREATOR_YEARLY",
    },
    features: [
      "30 videos per month",
      "No watermark",
      "Premium AI voices",
      "1080p export",
      "All platform formats",
      "Priority rendering",
    ],
  },
  {
    id: "lab",
    name: "Lab",
    blurb: "For teams and research groups.",
    monthly: 79,
    yearly: 65,
    cta: { label: "Start Lab", href: "/signup?plan=lab&interval=month&next=/create" },
    creditsPerMonth: 150,
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_ID_LAB_MONTHLY",
      yearly: "STRIPE_PRICE_ID_LAB_YEARLY",
    },
    features: [
      "150 videos per month",
      "Up to 5 team members",
      "Shared workspace",
      "Brand customization",
      "Multiple languages",
      "4K export",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "For institutions and publishers.",
    monthly: null,
    yearly: null,
    cta: { label: "Contact Sales", href: "/enterprise/contact-sales" },
    features: [
      "Unlimited videos",
      "Bulk video generation",
      "SSO and advanced security",
      "Custom branding & templates",
      "API access",
      "Dedicated support",
    ],
  },
];

export function getPlan(planId: string) {
  return PRICING_PLANS.find((p) => p.id === planId);
}

/** Resolve Stripe Price ID for a paid plan + interval. */
export function getStripePriceId(
  planId: string,
  interval: "month" | "year"
): string | null {
  const plan = getPlan(planId);
  if (!plan?.stripePriceEnv) return null;
  const envKey =
    interval === "year" ? plan.stripePriceEnv.yearly : plan.stripePriceEnv.monthly;
  return process.env[envKey] || null;
}

export interface ComparisonRow {
  feature: string;
  /** Value per plan id; boolean renders a check/dash. */
  values: Record<string, string | boolean>;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { feature: "Videos per month", values: { free: "1 free", creator: "30", lab: "150", enterprise: "Unlimited" } },
  { feature: "Max resolution", values: { free: "720p", creator: "1080p", lab: "4K", enterprise: "4K" } },
  { feature: "Watermark-free", values: { free: true, creator: true, lab: true, enterprise: true } },
  { feature: "Premium voices", values: { free: false, creator: true, lab: true, enterprise: true } },
  { feature: "Team workspace", values: { free: false, creator: false, lab: true, enterprise: true } },
  { feature: "Brand customization", values: { free: false, creator: false, lab: true, enterprise: true } },
  { feature: "Multiple languages", values: { free: false, creator: false, lab: true, enterprise: true } },
  { feature: "Bulk generation", values: { free: false, creator: false, lab: false, enterprise: true } },
  { feature: "API access", values: { free: false, creator: false, lab: false, enterprise: true } },
  { feature: "SSO & security controls", values: { free: false, creator: false, lab: false, enterprise: true } },
  { feature: "Support", values: { free: "Community", creator: "Email", lab: "Priority", enterprise: "Dedicated" } },
];

export const PRICING_FAQ = [
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade or downgrade at any time, and changes take effect on your next billing cycle.",
  },
  {
    q: "What counts as a video?",
    a: "Each finished, exported video counts once. Re-rendering edits to the same video does not count against your limit.",
  },
  {
    q: "Do you offer academic discounts?",
    a: "Yes — students and verified academic labs qualify for reduced pricing. Contact us to get set up.",
  },
  {
    q: "What happens if I hit my monthly limit?",
    a: "You can wait for your next cycle or upgrade instantly to keep creating.",
  },
  {
    q: "Is Enterprise pricing custom?",
    a: "Yes. Enterprise plans are tailored to volume, security, and branding needs. Contact sales for a quote.",
  },
];
