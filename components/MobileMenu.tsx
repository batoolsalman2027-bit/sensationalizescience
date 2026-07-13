"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ChevronRight, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import { MAIN_NAV, AUTH_NAV, type NavItem } from "@/config/navigation";

export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const [sub, setSub] = useState<NavItem | null>(null);

  // Lock background scroll while open; Escape closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="mobile-overlay" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="mobile-head">
        {sub ? (
          <button className="mobile-back" onClick={() => setSub(null)} aria-label="Back">
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <Link href="/" className="nav-brand" onClick={onClose} aria-label="Synapse home">
            <Logo size={30} />
            <span className="wordmark">synapse</span>
          </Link>
        )}
        <button className="icon-btn" onClick={onClose} aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <div className="mobile-body">
        {sub ? (
          <>
            <div className="mobile-sub-heading">{sub.label}</div>
            {sub.sections?.map((section, i) => (
              <div key={i}>
                {section.heading && <div className="mobile-sub-heading">{section.heading}</div>}
                {section.items.map((leaf) => (
                  <Link
                    key={leaf.href + leaf.label}
                    href={leaf.href}
                    className="mobile-row"
                    onClick={onClose}
                  >
                    {leaf.label}
                  </Link>
                ))}
              </div>
            ))}
          </>
        ) : (
          <>
            {MAIN_NAV.map((item) =>
              item.sections ? (
                <button key={item.label} className="mobile-row" onClick={() => setSub(item)}>
                  {item.label}
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              ) : (
                <Link key={item.label} href={item.href} className="mobile-row" onClick={onClose}>
                  {item.label}
                </Link>
              )
            )}

            <div className="mobile-cta-row">
              <Link href={AUTH_NAV.login.href} className="btn btn-outline btn-lg" onClick={onClose}>
                {AUTH_NAV.login.label}
              </Link>
              <Link href={AUTH_NAV.getStarted.href} className="btn btn-primary btn-lg" onClick={onClose}>
                {AUTH_NAV.getStarted.label}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
