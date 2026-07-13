"use client";

import { useEffect, useRef } from "react";

/**
 * Reveals children with a subtle fade/slide when scrolled into view.
 *
 * SSR renders the element visible (class `reveal` only). On mount, the client
 * decides: if the element is already in the viewport it just shows (no flash);
 * otherwise it arms the hidden state and reveals it via IntersectionObserver.
 * Respects prefers-reduced-motion, and a timeout guarantees content shows even
 * if the observer never fires. No changes to <html>, so no hydration mismatch.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const io = typeof IntersectionObserver !== "undefined";
    const inView = el.getBoundingClientRect().top < window.innerHeight * 0.92;

    if (reduce || !io || inView) {
      el.classList.add("in"); // stays visible; no animation for above-the-fold
      return;
    }

    el.classList.add("armed");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    const fallback = window.setTimeout(() => el.classList.add("in"), 1600);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const Comp = Tag as React.ElementType;
  return (
    <Comp ref={ref} className={`reveal ${className}`.trim()} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Comp>
  );
}
