import { Check, Minus } from "lucide-react";
import { PRICING_PLANS, COMPARISON_ROWS } from "@/config/pricing";

/** Plan comparison table. Reads the same pricing data object as the cards. */
export default function ComparisonTable() {
  return (
    <div className="compare-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th>Features</th>
            {PRICING_PLANS.map((p) => (
              <th key={p.id}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.feature}>
              <td>{row.feature}</td>
              {PRICING_PLANS.map((p) => {
                const v = row.values[p.id];
                return (
                  <td key={p.id}>
                    {typeof v === "boolean" ? (
                      v ? (
                        <Check className="yes" size={18} strokeWidth={2.5} aria-label="Included" />
                      ) : (
                        <Minus className="no" size={18} aria-label="Not included" />
                      )
                    ) : (
                      v
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
