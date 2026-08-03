"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ChevronRight, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import NavAccount from "./NavAccount";
import { MAIN_NAV, type NavItem } from "@/config/navigation";
import { SITE } from "@/config/site";

export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const [sub, setSub] = useState<NavItem | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portal to <body> so iOS Safari doesn't trap position:fixed inside the
  // header's backdrop-filter / border-radius containing block.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll while open; Escape closes.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="mobile-overlay" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="mobile-head">
        {sub ? (
          <button type="button" className="mobile-back" onClick={() => setSub(null)} aria-label="Back">
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <Link href="/" className="nav-brand" onClick={onClose} aria-label={`${SITE.name} home`}>
            <Logo size={30} />
            <span className="wordmark">{SITE.name}</span>
          </Link>
        )}
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close menu">
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
                <button
                  key={item.label}
                  type="button"
                  className="mobile-row"
                  onClick={() => setSub(item)}
                >
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
              <NavAccount variant="mobile" onNavigate={onClose} />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
