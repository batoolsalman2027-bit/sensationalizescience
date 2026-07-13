"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

const TYPED = "Reimagined as Video";
const CHAR_MS = 95;
const START_DELAY_MS = 420;
const CYCLE_MS = 10_000;

export default function HeroHeadline({ lead }: { lead: string }) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setText(TYPED);
      setDone(true);
      setShowPlay(true);
      return;
    }

    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timers: number[] = [];

    setText("");
    setDone(false);
    setShowPlay(false);

    const start = window.setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setText(TYPED.slice(0, i));
        if (i >= TYPED.length) {
          if (interval) clearInterval(interval);
          setDone(true);
          timers.push(window.setTimeout(() => setShowPlay(true), 220));
        }
      }, CHAR_MS);
    }, START_DELAY_MS);

    const next = window.setTimeout(() => setCycle((c) => c + 1), CYCLE_MS);

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(next);
      timers.forEach((t) => window.clearTimeout(t));
      if (interval) clearInterval(interval);
    };
  }, [cycle]);

  return (
    <h1 className="headline">
      <span className="headline-lead">{lead}</span>
      <span className="blue hero-typed-line">
        <span className="hero-typed" aria-label={TYPED}>
          {text}
          <span className={`hero-caret${done ? " hero-caret-done" : ""}`} aria-hidden="true" />
        </span>
        {showPlay && (
          <span className="hero-play-burst" aria-hidden="true">
            <span className="hero-play-ring" />
            <span className="hero-play-ring delay" />
            <span className="hero-play-btn">
              <Play size={14} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )}
      </span>
    </h1>
  );
}
