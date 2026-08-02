"use client";

import { useEffect, useRef } from "react";
import {
  FileUp,
  SlidersHorizontal,
  Microscope,
  Clapperboard,
  MessagesSquare,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { PRODUCTION_WORKFLOW } from "@/config/site";

const ICONS: Record<string, LucideIcon> = {
  FileUp,
  SlidersHorizontal,
  Microscope,
  Clapperboard,
  MessagesSquare,
  PackageCheck,
};

/**
 * The premium production process, drawn as a serpentine timeline:
 * stages 1-3 on the first row, 4-6 on the second, connected by a rail that
 * fills as the section scrolls into view.
 *
 * Motion is strictly additive. The markup renders fully visible by default;
 * only after mount (and only when the section is still below the fold, and
 * the visitor hasn't asked for reduced motion) does the component arm the
 * hidden state via `.armed`. With JS off, the diagram reads exactly the same.
 */
export default function ProductionWorkflow() {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    el.classList.add("armed");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          el.classList.add("in");
          observer.disconnect();
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(el);

    // Guarantees the stages appear even if the observer never fires.
    const fallback = window.setTimeout(() => el.classList.add("in"), 1800);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <ol className="wf" ref={ref}>
      {PRODUCTION_WORKFLOW.map((stage, i) => {
        const Icon = ICONS[stage.icon] ?? Microscope;
        const isLast = i === PRODUCTION_WORKFLOW.length - 1;
        return (
          <li
            key={stage.step}
            className={`wf-stage${isLast ? " wf-stage-final" : ""}`}
            style={{ "--wf-i": i } as React.CSSProperties}
          >
            <div className="wf-rail" aria-hidden="true">
              <span className="wf-rail-line" />
              <span className="wf-node">
                <Icon size={20} strokeWidth={1.75} />
              </span>
            </div>
            <div className="wf-body">
              <p className="wf-step">
                Step {stage.step}
              </p>
              <h3 className="wf-title">{stage.title}</h3>
              <ul className="wf-points">
                {stage.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
