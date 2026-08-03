"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  CREDIT_BASE_PRICE_USD,
  CREDIT_PACKS,
  formatUsd,
  isPaidPackId,
  packDiscountPercent,
  packPerVideoUsd,
  type CreditPack,
  type CreditPackId,
} from "@/config/pricing";

type Props = {
  /** Default = pricing page links. checkout = paywall / purchase CTAs. */
  mode?: "links" | "checkout";
  authenticated?: boolean;
  /** Free video already used (dims Try it CTA in checkout mode). */
  freeUsed?: boolean;
  busyPackId?: string | null;
  onSelectPack?: (packId: Exclude<CreditPackId, "try" | "custom">) => void;
};

function creditLabel(pack: CreditPack): string {
  if (pack.id === "try") return "1 free credit";
  if (pack.credits === null) return "50+ credits";
  return `${pack.credits} credit${pack.credits === 1 ? "" : "s"}`;
}

function priceBlock(pack: CreditPack) {
  if (pack.priceUsd === null) {
    return (
      <>
        <div className="price-amount">Contact</div>
        <div className="price-per">Custom pricing for 50+</div>
      </>
    );
  }
  if (pack.priceUsd === 0) {
    return (
      <>
        <div className="price-amount">$0</div>
        <div className="price-per">{creditLabel(pack)}</div>
      </>
    );
  }
  const per = packPerVideoUsd(pack);
  const discount = packDiscountPercent(pack);
  return (
    <>
      <div className="price-amount">{formatUsd(pack.priceUsd)}</div>
      <div className="price-per">
        {creditLabel(pack)}
        {per !== null && per > 0 ? ` · ${formatUsd(per)}/video` : ""}
      </div>
      {discount !== null && (
        <div className="price-save">
          {discount}% off vs {formatUsd(CREDIT_BASE_PRICE_USD)}/video
        </div>
      )}
    </>
  );
}

export default function PricingSection({
  mode = "links",
  authenticated = false,
  freeUsed = false,
  busyPackId = null,
  onSelectPack,
}: Props) {
  return (
    <div>
      <div className="price-grid price-grid-packs">
        {CREDIT_PACKS.map((pack) => {
          const paid = isPaidPackId(pack.id);
          const busy = busyPackId === pack.id;

          let cta: ReactNode;
          if (mode === "links") {
            cta = (
              <Link
                href={pack.cta.href}
                className={`btn ${pack.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
              >
                {pack.cta.label}
              </Link>
            );
          } else if (pack.id === "try") {
            cta = (
              <Link
                href="/create"
                className="btn btn-primary"
                style={{ width: "100%", opacity: freeUsed ? 0.55 : 1 }}
              >
                {freeUsed ? "Free video used" : pack.cta.label}
              </Link>
            );
          } else if (pack.id === "custom") {
            cta = (
              <Link
                href={pack.cta.href}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                {pack.cta.label}
              </Link>
            );
          } else if (paid && authenticated && onSelectPack) {
            const paidId = pack.id;
            cta = (
              <button
                type="button"
                className={`btn ${pack.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
                disabled={Boolean(busyPackId)}
                onClick={() => {
                  if (isPaidPackId(paidId)) onSelectPack(paidId);
                }}
              >
                {busy ? "Opening Stripe…" : pack.cta.label}
              </button>
            );
          } else if (paid) {
            cta = (
              <Link
                href={`/signup?pack=${pack.id}&next=/create`}
                className={`btn ${pack.featured ? "btn-blue" : "btn-primary"}`}
                style={{ width: "100%" }}
              >
                {pack.cta.label}
              </Link>
            );
          }

          return (
            <div key={pack.id} className={`price-card${pack.featured ? " featured" : ""}`}>
              {pack.badge && <span className="price-tag">{pack.badge}</span>}
              <h3 style={{ fontSize: 20, margin: 0 }}>{pack.name}</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "6px 0 0" }}>
                {pack.blurb}
              </p>

              {priceBlock(pack)}

              <ul className="price-features">
                <li>
                  <Check size={16} strokeWidth={2.5} /> {creditLabel(pack)}
                </li>
                {pack.priceUsd === 0 && (
                  <li>
                    <Check size={16} strokeWidth={2.5} /> No risk to try
                  </li>
                )}
                {pack.id === "custom" && (
                  <li>
                    <Check size={16} strokeWidth={2.5} /> Tailored for institutions
                  </li>
                )}
                {paid && (
                  <li>
                    <Check size={16} strokeWidth={2.5} /> Credits never expire
                  </li>
                )}
              </ul>

              {cta}
            </div>
          );
        })}
      </div>
    </div>
  );
}
