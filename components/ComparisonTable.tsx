import Link from "next/link";
import { Check } from "lucide-react";
import { CREDIT_CONTACT_FEATURES, CREDIT_INCLUDES } from "@/config/pricing";

/** Shared inclusions for every credit — replaces the old tier comparison table. */
export default function ComparisonTable() {
  return (
    <div className="credit-includes">
      <div className="credit-includes-grid">
        <div className="credit-includes-col">
          <h3 className="credit-includes-heading">Included with every credit</h3>
          <ul className="price-features" style={{ marginTop: 12 }}>
            {CREDIT_INCLUDES.map((f) => (
              <li key={f}>
                <Check size={16} strokeWidth={2.5} /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="credit-includes-col">
          <h3 className="credit-includes-heading">Need more?</h3>
          <ul className="price-features" style={{ marginTop: 12 }}>
            {CREDIT_CONTACT_FEATURES.map((f) => (
              <li key={f}>
                <Check size={16} strokeWidth={2.5} /> {f} —{" "}
                <Link href="/resources/contact" style={{ color: "var(--blue)", fontWeight: 700 }}>
                  Contact us
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
