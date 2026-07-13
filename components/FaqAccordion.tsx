"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqGroup } from "@/config/faq";

/** Accessible FAQ accordion. Pass grouped questions; groups render category headings. */
export default function FaqAccordion({
  groups,
  showCategories = true,
}: {
  groups: FaqGroup[];
  showCategories?: boolean;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.category}>
          {showCategories && <h3 className="faq-cat">{group.category}</h3>}
          {group.questions.map((item, i) => {
            const key = `${group.category}-${i}`;
            const isOpen = openKey === key;
            return (
              <div key={key} className="faq-item" data-open={isOpen}>
                <button
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                >
                  {item.q}
                  <ChevronDown className="chev" size={20} strokeWidth={2} />
                </button>
                {isOpen && <div className="faq-a">{item.a}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
