"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Play, Check, FileText, Sparkles, Clapperboard } from "lucide-react";

const PROMPT = "Turn this neuroscience paper into an easily understandable 60 second video";

const STEPS = [
  { id: "reading", hold: 2800 },
  { id: "extracting", hold: 2800 },
  { id: "storyboard", hold: 3000 },
  { id: "preview", hold: 5000 },
] as const;

type Phase = "idle" | "typing" | (typeof STEPS)[number]["id"];

/**
 * Product demo — autoplays on load, then loops:
 * type prompt → read paper → extract → storyboard → video.
 */
export default function HeroWorkflow() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    let cancelled = false;

    (async () => {
      setPhase("idle");
      setTyped("");
      await wait(reduce ? 400 : 600);
      if (cancelled) return;

      setPhase("typing");
      if (reduce) {
        setTyped(PROMPT);
        await wait(800);
      } else {
        for (let i = 1; i <= PROMPT.length; i++) {
          if (cancelled) return;
          setTyped(PROMPT.slice(0, i));
          await wait(48 + (i % 5 === 0 ? 40 : 0));
        }
        await wait(900);
      }
      if (cancelled) return;

      for (const step of STEPS) {
        if (cancelled) return;
        setPhase(step.id);
        await wait(reduce ? Math.min(step.hold, 1200) : step.hold);
      }
      if (cancelled) return;

      setCycle((c) => c + 1);
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [cycle]);

  const inProcess =
    phase === "reading" || phase === "extracting" || phase === "storyboard" || phase === "preview";
  const showVideo = phase === "preview";
  const showThumb = inProcess;
  const showCaret = phase === "idle" || phase === "typing";
  const showProcess = phase === "reading" || phase === "extracting" || phase === "storyboard";

  return (
    <div
      className={`hero-mock phase-${phase}`}
      aria-label="Example: Sensationalize Medicine generating a research video from a paper"
      aria-live="polite"
    >
      <div className={`hm-pane${showVideo ? " on" : ""}${showProcess ? " status" : ""}`}>
        {showVideo ? (
          <div className="hm-film" aria-hidden="true">
            <img
              className="hm-film-img"
              src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1400&q=80"
              alt=""
            />
            <div className="hm-film-shade" />
            <div className="hm-film-play">
              <Play size={22} fill="currentColor" />
            </div>
            <div className="hm-film-meta">
              <span className="hm-film-tag">60s · Neuroscience</span>
              <strong>Synaptic plasticity under stress</strong>
            </div>
            <div className="hm-film-bar">
              <i />
            </div>
          </div>
        ) : phase === "reading" ? (
          <div className="hm-step hm-step-read" aria-hidden="true">
            <div className="hm-step-label">
              <FileText size={14} strokeWidth={2} />
              Reading paper
            </div>
            <div className="hm-paper">
              <div className="hm-paper-title" />
              <div className="hm-paper-lines">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="hm-paper-scan" />
            </div>
          </div>
        ) : phase === "extracting" ? (
          <div className="hm-step hm-step-extract" aria-hidden="true">
            <div className="hm-step-label">
              <Sparkles size={14} strokeWidth={2} />
              Extracting key information
            </div>
            <div className="hm-findings">
              <div className="hm-finding">
                <span className="tick">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className="bar" />
              </div>
              <div className="hm-finding">
                <span className="tick">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className="bar" />
              </div>
              <div className="hm-finding">
                <span className="tick">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className="bar" />
              </div>
            </div>
          </div>
        ) : phase === "storyboard" ? (
          <div className="hm-step hm-step-board" aria-hidden="true">
            <div className="hm-step-label">
              <Clapperboard size={14} strokeWidth={2} />
              Building storyboard &amp; script
            </div>
            <div className="hm-board">
              <div className="hm-tile">
                <b>01</b>
                <i />
              </div>
              <div className="hm-tile">
                <b>02</b>
                <i />
              </div>
              <div className="hm-tile">
                <b>03</b>
                <i />
              </div>
              <div className="hm-tile">
                <b>04</b>
                <i />
              </div>
            </div>
            <div className="hm-script">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : (
          <div className="hm-pane-empty" aria-hidden="true" />
        )}
      </div>

      <div
        className={`hm-prompt${inProcess ? " busy" : ""}${
          phase === "typing" || phase === "idle" ? " focus" : ""
        }`}
      >
        <div className="hm-prompt-main">
          {showThumb && (
            <div className="hm-thumb" aria-hidden="true">
              <div className="hm-thumb-art" />
              {(phase === "reading" || phase === "extracting" || phase === "storyboard") && (
                <span className="hm-spinner" />
              )}
            </div>
          )}
          <div className="hm-prompt-copy">
            <p className="hm-prompt-text">
              {typed}
              {showCaret && <span className="hm-caret" aria-hidden="true" />}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`hm-send${inProcess ? " armed" : ""}`}
          aria-label="Generate video"
          tabIndex={-1}
        >
          <ArrowUp size={20} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
