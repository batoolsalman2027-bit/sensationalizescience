"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import { MAIN_NAV, AUTH_NAV, type NavItem } from "@/config/navigation";
import { SITE } from "@/config/site";

function DropdownPanel({ item }: { item: NavItem }) {
  const sections = item.sections ?? [];
  const panelClass =
    item.layout === "grid"
      ? "dropdown-panel"
      : item.layout === "columns"
      ? "dropdown-panel"
      : "dropdown-panel";
  const innerClass =
    item.layout === "grid" ? "dd-grid" : item.layout === "columns" ? "dd-columns" : "dd-list";

  return (
    <div className={panelClass} role="menu" aria-label={item.label}>
      <div className={innerClass}>
        {item.layout === "columns"
          ? sections.map((sec, i) => (
              <div key={i}>
                {sec.heading && <div className="dd-col-heading">{sec.heading}</div>}
                {sec.items.map((leaf) => (
                  <Link key={leaf.href + leaf.label} href={leaf.href} className="dd-item" role="menuitem">
                    <span className="dd-item-title">{leaf.label}</span>
                  </Link>
                ))}
              </div>
            ))
          : sections
              .flatMap((s) => s.items)
              .map((leaf) => (
                <Link key={leaf.href + leaf.label} href={leaf.href} className="dd-item" role="menuitem">
                  <span className="dd-item-title">{leaf.label}</span>
                  {leaf.description && <span className="dd-item-desc">{leaf.description}</span>}
                </Link>
              ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Close dropdowns on route change.
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  // Scroll-aware header: floats as a glass bar once the page scrolls.
  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 16);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes; click outside closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const openMenu = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 130);
  };

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <nav className="nav-inner" ref={navRef} aria-label="Primary">
          <Link href="/" className="nav-brand" aria-label={`${SITE.name} home`}>
            <Logo size={34} />
            <span className="wordmark">{SITE.name}</span>
          </Link>

          <div className="nav-primary">
            {MAIN_NAV.map((item) =>
              item.sections ? (
                <div
                  key={item.label}
                  className="nav-item"
                  data-open={open === item.label}
                  onMouseEnter={() => openMenu(item.label)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className="nav-trigger"
                    aria-haspopup="true"
                    aria-expanded={open === item.label}
                    onClick={() => setOpen(open === item.label ? null : item.label)}
                  >
                    {item.label}
                    <ChevronDown className="chev" size={15} strokeWidth={2.4} />
                  </button>
                  {open === item.label && <DropdownPanel item={item} />}
                </div>
              ) : (
                <div key={item.label} className="nav-item">
                  <Link href={item.href} className="nav-trigger">
                    {item.label}
                  </Link>
                </div>
              )
            )}
          </div>

          <div className="nav-spacer" />

          <div className="nav-cta-group">
            <Link href={AUTH_NAV.login.href} className="btn btn-ghost">
              {AUTH_NAV.login.label}
            </Link>
            <Link href={AUTH_NAV.getStarted.href} className="btn btn-gray">
              {AUTH_NAV.getStarted.label}
            </Link>
          </div>

          <button
            type="button"
            className="nav-toggle"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </nav>
      </div>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} />}
    </header>
  );
}
