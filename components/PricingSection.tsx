"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_PLANS } from "@/config/pricing";

type Interval = "month" | "year";

type Props = {
  /** Default = normal pricing page links. checkout = paywall / purchase CTAs. */
  mode?: "links" | "checkout";
  authenticated?: boolean;
  /** Free video already used (dims Free CTA in checkout mode). */
  freeUsed?: boolean;
  busyPlanId?: string | null;
  onSelectPlan?: (planId: "creator" | "lab", interval: Interval) => void;
};

export default function PricingSection({
  mode = "links",
  authenticated = false,
  freeUsed = false,
  busyPlanId = null,
  onSelectPlan,
}: Props) {
  const [yearly, setYearly] = useState(false);
  const interval: Interval = yearly ? "year" : "month";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 34 }}>
        <div className="price-toggle" role="tablist" aria-label="Billing period">
          <button
            type="button"
            role="tab"
            aria-selected={!yearly}
            className={`toggle-btn${!yearly ? " active" : ""}`}
            onClick={() => setYearly(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={yearly}
            className={`toggle-btn${yearly ? " active" : ""}`}
            onClick={() => setYearly(true)}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="price-grid">
        {PRICING_PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          const isPaid = plan.id === "creator" || plan.id === "lab";
          const busy = busyPlanId === plan.id;

          let cta: ReactNode;
          if (mode === "links") {
            cta = (
              <Link
                href={plan.cta.href}
                className={`btn ${plan.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
              >
                {plan.cta.label}
              </Link>
            );
          } else if (plan.id === "free") {
            cta = (
              <Link
                href="/create"
                className="btn btn-primary"
                style={{ width: "100%", opacity: freeUsed ? 0.55 : 1 }}
              >
                {freeUsed ? "Free video used" : plan.cta.label}
              </Link>
            );
          } else if (plan.id === "enterprise") {
            cta = (
              <Link href={plan.cta.href} className="btn btn-primary" style={{ width: "100%" }}>
                {plan.cta.label}
              </Link>
            );
          } else if (isPaid && authenticated && onSelectPlan) {
            cta = (
              <button
                type="button"
                className={`btn ${plan.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
                disabled={Boolean(busyPlanId)}
                onClick={() => onSelectPlan(plan.id as "creator" | "lab", interval)}
              >
                {busy ? "Opening Stripe…" : plan.cta.label}
              </button>
            );
          } else if (isPaid) {
            const qs = `?plan=${plan.id}&interval=${interval}&next=/create`;
            cta = (
              <Link
                href={`/signup${qs}`}
                className={`btn ${plan.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
              >
                {plan.cta.label}
              </Link>
            );
          }

          return (
            <div key={plan.id} className={`price-card${plan.featured ? " featured" : ""}`}>
              {plan.featured && <span className="price-tag">Most popular</span>}
              <h3 style={{ fontSize: 20, margin: 0 }}>{plan.name}</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "6px 0 0" }}>{plan.blurb}</p>

              <div className="price-amount">{price === null ? "Custom" : `$${price}`}</div>
              <div className="price-per">
                {price === null
                  ? "Contact us for a quote"
                  : yearly
                    ? "per month, billed yearly"
                    : "per month"}
              </div>

              <ul className="price-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>

              {cta}
            </div>
          );
        })}
      </div>
    </div>
  );
}
