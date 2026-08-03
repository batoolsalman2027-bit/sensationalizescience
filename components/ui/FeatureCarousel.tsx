"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "@/components/Icon";
import { CORE_FEATURES } from "@/config/site";

/**
 * Feature carousel for the homepage "Purpose-built for research" section.
 * Auto-advancing, crossfading split layout (text left, image right) with a
 * progress rail. Adapted from an elegant-carousel pattern and themed to the
 * site (paper background, lime accent). Images live in /public/carousel.
 */

const ACCENT = "#7dd321"; // site lime
const SLIDE_DURATION = 6000;
const TRANSITION_DURATION = 700;

const SLIDES = CORE_FEATURES.map((f) => ({
  icon: f.icon,
  title: f.title,
  body: f.body,
  image: f.image,
}));

export default function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  const goToSlide = useCallback(
    (next: number) => {
      if (transitioning || next === index) return;
      setTransitioning(true);
      setProgress(0);
      window.setTimeout(() => {
        setIndex(next);
        window.setTimeout(() => setTransitioning(false), 50);
      }, TRANSITION_DURATION / 2);
    },
    [transitioning, index]
  );

  const goNext = useCallback(
    () => goToSlide((index + 1) % SLIDES.length),
    [index, goToSlide]
  );
  const goPrev = useCallback(
    () => goToSlide((index - 1 + SLIDES.length) % SLIDES.length),
    [index, goToSlide]
  );

  useEffect(() => {
    if (paused) return;
    const prog = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 100 / (SLIDE_DURATION / 50)));
    }, 50);
    const tick = window.setInterval(goNext, SLIDE_DURATION);
    return () => {
      window.clearInterval(prog);
      window.clearInterval(tick);
    };
  }, [index, paused, goNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    const diff = touchStart.current - touchEnd.current;
    if (Math.abs(diff) > 60) diff > 0 ? goNext() : goPrev();
  };

  const slide = SLIDES[index];
  const fx = transitioning ? "is-out" : "is-in";

  return (
    <div
      className="fc"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="group"
      aria-roledescription="carousel"
      aria-label="Platform features"
    >
      <div className="fc-inner">
        {/* Text */}
        <div className="fc-content">
          <div className={`fc-kicker ${fx}`}>
            <span className="fc-icon" style={{ color: ACCENT }}>
              <Icon name={slide.icon} size={20} />
            </span>
          </div>

          <h3 className={`fc-title ${fx}`}>{slide.title}</h3>
          <p className={`fc-body ${fx}`}>{slide.body}</p>

          <div className="fc-arrows">
            <button className="fc-arrow" onClick={goPrev} aria-label="Previous feature">
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <button className="fc-arrow" onClick={goNext} aria-label="Next feature">
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="fc-media">
          <div className={`fc-frame ${fx}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="fc-img" loading="lazy" />
            <div
              className="fc-img-overlay"
              style={{ background: `linear-gradient(135deg, ${ACCENT}22 0%, transparent 55%)` }}
            />
          </div>
          <span className="fc-corner fc-corner--tl" style={{ borderColor: ACCENT }} />
          <span className="fc-corner fc-corner--br" style={{ borderColor: ACCENT }} />
        </div>
      </div>

      {/* Progress rail */}
      <div className="fc-rail">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            className={`fc-rail-item${i === index ? " active" : ""}`}
            onClick={() => goToSlide(i)}
            aria-label={`Go to ${s.title}`}
            aria-current={i === index}
          >
            <span className="fc-rail-track">
              <span
                className="fc-rail-fill"
                style={{
                  width: i === index ? `${progress}%` : i < index ? "100%" : "0%",
                  backgroundColor: i === index ? ACCENT : undefined,
                }}
              />
            </span>
            <span className="fc-rail-label">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
