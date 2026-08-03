"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Button from "./Button";

/**
 * Homepage hero — two-layer scroll-expansion mechanic, rebuilt for the premium
 * positioning (labs / journals / biotech).
 *
 * Layers:
 *  - background video (public/hero/hero-bg.mp4), object-cover, dimmed by a scrim
 *  - a small centered "zoom" video (public/hero/hero-zoom.mp4) that expands from
 *    a ~half-size framed panel to full-bleed as you scroll — the reveal
 *
 * Composition reads strictly top-to-bottom as one sentence:
 *   AI for scientific communication            (eyebrow)
 *   Sensationalize Science                      (wordmark / title)
 *   Scientific Papers,                          (headline line 1, warm white)
 *   Reimagined as Video                         (headline line 2 — revealed, lime)
 *   [ Start a Project ] [ Watch Demos ]         (CTAs — revealed)
 *
 * Reversible: the reveal plays forward on scroll-down and collapses again when
 * you scroll back up to the very top, so the scroll feature is replayable — not
 * a one-shot at page load.
 *
 * Accessibility / robustness:
 * - Renders the COMPLETED composition by default (SSR / no-JS / reduced-motion
 *   / mobile) so the full sentence and both CTAs are always present, legible,
 *   and reachable. The scroll choreography is a desktop enhancement armed in
 *   useLayoutEffect (before paint, so no flash).
 * - prefers-reduced-motion: videos are NOT autoplayed — poster frames show
 *   instead, and the composition is static.
 * - CTAs are real links in the DOM from first paint; the reveal is opacity /
 *   transform only (never display:none). Focusing a CTA, or pressing a
 *   page-advance key, completes the reveal — the hero can never trap a keyboard
 *   user.
 */
export default function HomeHero() {
  // Default state = fully revealed (safe for SSR / no-JS / reduced-motion / mobile).
  const [progress, setProgress] = useState(1);
  const [expanded, setExpanded] = useState(true);
  const [armed, setArmed] = useState(false);
  const [motion, setMotion] = useState(false);

  const progressRef = useRef(1);
  const expandedRef = useRef(true);
  const bgRef = useRef<HTMLVideoElement>(null);
  const zoomRef = useRef<HTMLVideoElement>(null);

  const setP = (v: number) => {
    progressRef.current = v;
    setProgress(v);
  };
  const setExp = (v: boolean) => {
    expandedRef.current = v;
    setExpanded(v);
  };
  const complete = () => {
    setP(1);
    setExp(true);
  };

  // Decide motion + arm the scroll choreography. Runs before paint so the
  // collapsed first frame shows without a flash.
  useLayoutEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia?.("(max-width: 768px)").matches;
    if (reduce) return; // keep completed + posters (no autoplay)
    setMotion(true);
    if (mobile) return; // full-bleed video hero, but no scroll hijack on touch
    window.scrollTo(0, 0); // ignore any browser scroll-restoration; start collapsed at the top
    setArmed(true);
    setExp(false);
    setP(0);
  }, []);

  // Play / pause the videos in step with the motion preference.
  useEffect(() => {
    for (const v of [bgRef.current, zoomRef.current]) {
      if (!v) continue;
      if (motion) v.play().catch(() => {});
      else v.pause();
    }
  }, [motion]);

  // Reversible scroll choreography. Listeners stay attached the whole time the
  // hero is armed and read live state from refs, so the reveal can play forward
  // and collapse again when the user scrolls back to the top.
  useEffect(() => {
    if (!armed) return;
    const WHEEL_K = 0.0011;
    const TOUCH_K = 0.006;

    const drive = (deltaTop: number, k: number) => {
      const nv = Math.min(Math.max(progressRef.current + deltaTop * k, 0), 1);
      setP(nv);
      if (nv >= 1) setExp(true);
    };

    const onWheel = (e: WheelEvent) => {
      if (!expandedRef.current) {
        e.preventDefault();
        drive(e.deltaY, WHEEL_K);
      } else if (e.deltaY < 0 && window.scrollY <= 0) {
        // reverse: re-collapse once back at the very top
        e.preventDefault();
        setExp(false);
        drive(e.deltaY, WHEEL_K);
      }
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const delta = touchY - y; // >0 scrolling down, <0 scrolling up
      touchY = y;
      if (!expandedRef.current) {
        e.preventDefault();
        drive(delta, TOUCH_K);
      } else if (delta < 0 && window.scrollY <= 0) {
        e.preventDefault();
        setExp(false);
        drive(delta, TOUCH_K);
      }
    };

    // Pin the window to the top while collapsed / mid-reveal.
    const onScroll = () => {
      if (!expandedRef.current) window.scrollTo(0, 0);
    };
    // Never trap a keyboard user: a page-advance key completes the reveal.
    const onKey = (e: KeyboardEvent) => {
      if (!expandedRef.current && ["ArrowDown", "PageDown", "End", " ", "Spacebar"].includes(e.key))
        complete();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  const revealT = Math.min(Math.max((progress - 0.5) / 0.4, 0), 1);
  const reveal = {
    opacity: revealT,
    transform: `translateY(${((1 - revealT) * 16).toFixed(1)}px)`,
  };

  return (
    <section className="hh" aria-label="Sensationalize Science: Scientific papers, reimagined as video">
      <div className="hh-bg" aria-hidden="true" style={{ opacity: 1 - progress * 0.55 }}>
        <video
          ref={bgRef}
          className="hh-vid"
          src="/hero/hero-bg.mp4"
          poster="/hero/hero-bg.jpg"
          muted
          loop
          playsInline
          preload="auto"
          autoPlay={motion}
          disablePictureInPicture
        />
      </div>

      <div
        className="hh-media"
        aria-hidden="true"
        style={{
          clipPath: `inset(${((1 - progress) * 39).toFixed(2)}% ${((1 - progress) * 38).toFixed(
            2
          )}% round ${((1 - progress) * 26).toFixed(1)}px)`,
        }}
      >
        <div className="hh-media-img" style={{ transform: `scale(${(1 + (1 - progress) * 0.06).toFixed(3)})` }}>
          <video
            ref={zoomRef}
            className="hh-vid"
            src="/hero/hero-zoom.mp4"
            poster="/hero/hero-zoom.jpg"
            muted
            loop
            playsInline
            preload="auto"
            autoPlay={motion}
            disablePictureInPicture
          />
        </div>
      </div>

      <div className="hh-scrim" aria-hidden="true" />
      <div className="hh-textscrim" aria-hidden="true" />

      <div className="hh-inner">
        <div className="hh-copy">
          <p className="hh-eyebrow">AI for scientific communication</p>
          <span className="hh-rule" aria-hidden="true" />
          <h1 className="hh-wordmark">Sensationalize Science</h1>
          <p className="hh-sentence">
            Scientific Papers,
            <span className="hh-line2" style={reveal}>
              {" "}
              Reimagined as Video
            </span>
          </p>
          <div className="hh-ctas" style={reveal} onFocus={() => { if (armed && !expanded) complete(); }}>
            <Button href="/create" variant="blue" large>
              Start a Project
            </Button>
            <Button href="/gallery" variant="outline" large>
              Watch Demos
            </Button>
          </div>
        </div>
      </div>

      {armed && (
        <div className="hh-cue" style={{ opacity: 1 - Math.min(progress * 3, 1) }} aria-hidden="true">
          <span>Scroll</span>
          <ChevronDown className="chev" size={18} strokeWidth={2} />
        </div>
      )}
    </section>
  );
}
