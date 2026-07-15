"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ICONS } from "@/remotion/icons";
import { FlaskConical, UploadCloud, Download } from "lucide-react";
import PricingSection from "@/components/PricingSection";
import RenderOptionsPicker from "@/components/RenderOptionsPicker";
import {
  ASPECT_RATIOS,
  VOICES,
  type AspectRatioId,
} from "@/config/render-options";

interface Scene {
  index: number;
  title: string;
  narration: string;
  icon: string;
  figureId?: string | null;
}
interface VideoScript {
  paperTitle: string;
  authors?: string;
  journal?: string;
  doi?: string;
  hook: string;
  background?: string;
  scenes: Scene[];
  fullNarration: string;
  figures?: { id: string; caption: string; page: number }[];
}

type Stage = "idle" | "scripting" | "script-ready" | "rendering" | "done" | "error";

type BillingStatus = {
  authenticated: boolean;
  email: string | null;
  credits: number;
  freeUsed: boolean;
  canGenerate: boolean;
  packLabel: string;
};

function SceneIcon({ icon }: { icon: string }) {
  const Icon = ICONS[icon] ?? FlaskConical;
  return <Icon size={19} color="var(--blue)" strokeWidth={2} />;
}

export default function Uploader() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>(ASPECT_RATIOS[0].id);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCheckoutRef = useRef(false);

  const refreshBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (!res.ok) return;
      const data = (await res.json()) as BillingStatus;
      setBilling(data);
      if (data.canGenerate) setShowPaywall(false);
      return data;
    } catch {
      return null;
    }
  }, []);

  const startPlanCheckout = useCallback(
    async (planId: "creator" | "lab" | "credits", interval: "month" | "year" = "month") => {
      setBusyPlanId(planId);
      setError(null);
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId, interval }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("No checkout URL returned");
      } catch (err: any) {
        setError(err.message);
        setShowPaywall(true);
      } finally {
        setBusyPlanId(null);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      const status = await refreshBilling();
      const params = new URLSearchParams(window.location.search);

      if (params.get("checkout") === "success") {
        setCheckoutNote("Payment received — your plan credits will appear in a few seconds.");
        refreshBilling();
        window.history.replaceState({}, "", "/create");
        setTimeout(() => refreshBilling(), 2500);
        return;
      }
      if (params.get("checkout") === "cancel") {
        setCheckoutNote("Checkout canceled — no charge was made.");
        setShowPaywall(true);
        window.history.replaceState({}, "", "/create");
        return;
      }

      const plan = params.get("plan");
      const interval = params.get("interval") === "year" ? "year" : "month";
      if (
        (plan === "creator" || plan === "lab") &&
        status?.authenticated &&
        !pendingCheckoutRef.current
      ) {
        pendingCheckoutRef.current = true;
        window.history.replaceState({}, "", "/create");
        await startPlanCheckout(plan, interval);
      }
    })();
  }, [refreshBilling, startPlanCheckout]);

  // ---- Stage 1: upload PDF -> get script ----
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setShowPaywall(false);
    setScript(null);
    setVideoUrl(null);
    setFileName(file.name);
    setStage("scripting");

    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await fetch("/api/script", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Script generation failed");
      setScript(data.script);
      setStage("script-ready");
    } catch (err: any) {
      setError(err.message);
      setStage("error");
    }
  }, []);

  // ---- Stage 2: script -> rendered video (async + polling) ----
  const generateVideo = useCallback(async () => {
    if (!script) return;

    if (billing && !billing.canGenerate) {
      setShowPaywall(true);
      setError(null);
      return;
    }

    setError(null);
    setShowPaywall(false);
    setStage("rendering");

    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          options: { voiceId, aspectRatio },
        }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setShowPaywall(true);
        setStage("script-ready");
        setError(null);
        await refreshBilling();
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Could not start render");

      await refreshBilling();

      const jobId = data.jobId;
      pollRef.current = setInterval(async () => {
        const s = await fetch(`/api/status?jobId=${jobId}`);
        const sData = await s.json();
        const job = sData.job;
        if (!job) return;
        if (job.status === "done") {
          clearInterval(pollRef.current!);
          setVideoUrl(job.videoUrl);
          setStage("done");
        } else if (job.status === "error") {
          clearInterval(pollRef.current!);
          setError(job.error ?? "Render failed");
          setStage("error");
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message);
      setStage("error");
    }
  }, [script, billing, refreshBilling, voiceId, aspectRatio]);

  const busy = stage === "scripting" || stage === "rendering";

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragActive(false);
      if (busy) return;
      const f = e.dataTransfer.files?.[0];
      if (f && f.type === "application/pdf") handleFile(f);
    },
    [busy, handleFile]
  );

  const statusLine = (() => {
    if (!billing) return null;
    if (!billing.freeUsed) {
      return "1 free video left on this device";
    }
    if (billing.authenticated) {
      return `${billing.credits} video credit${billing.credits === 1 ? "" : "s"} · ${billing.email}`;
    }
    return "Free video used — choose a plan to continue";
  })();

  return (
    <div>
      {(statusLine || checkoutNote) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--paper)",
            fontSize: 13.5,
          }}
        >
          <div style={{ color: "var(--ink-soft)" }}>{checkoutNote ?? statusLine}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {billing?.authenticated ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: "7px 14px" }}
                  onClick={() => setShowPaywall(true)}
                >
                  View plans
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 13, padding: "7px 14px" }}
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    refreshBilling();
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13.5 }}>
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary" style={{ fontSize: 13, padding: "7px 14px" }}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <label
        className={`dropzone${busy ? " dropzone-disabled" : ""}${
          dragActive ? " dropzone-active" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="upload-badge">
          <UploadCloud size={30} color="var(--blue)" strokeWidth={2} />
        </div>
        <div style={{ fontSize: 19, marginBottom: 8, fontWeight: 700 }}>
          {fileName ?? "Drop your paper here, or click to upload"}
        </div>
        <div style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
          Text-based PDFs only — scanned papers need OCR first
        </div>
      </label>

      {stage === "scripting" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, justifyContent: "center" }}>
          <span className="spinner" />
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>
            Reading the paper and writing a script…
          </p>
        </div>
      )}
      {stage === "rendering" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, justifyContent: "center" }}>
          <span className="spinner" />
          <p style={{ color: "var(--ink-soft)", margin: 0, textAlign: "center" }}>
            Illustrating, narrating and animating each scene locally — this can
            take a few minutes, longer on the very first run…
          </p>
        </div>
      )}
      {error && !showPaywall && (
        <p style={{ color: "var(--error)", marginTop: 22, textAlign: "center" }}>{error}</p>
      )}

      {showPaywall && (
        <section className="fade-up" style={{ marginTop: 36 }}>
          <h2 className="section-title" style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>
            Choose a plan to keep creating
          </h2>
          <p
            style={{
              color: "var(--ink-soft)",
              textAlign: "center",
              fontSize: 15,
              margin: "0 auto 28px",
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            You&apos;ve used your free video. Pick Creator or Lab to unlock more generations —
            payment goes to Sensationalize Medicine and covers API costs.
          </p>
          {error && (
            <p style={{ color: "var(--error)", textAlign: "center", marginBottom: 16 }}>{error}</p>
          )}
          {!billing?.authenticated && (
            <p style={{ textAlign: "center", fontSize: 14, marginBottom: 18 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ fontWeight: 700, color: "var(--blue)" }}>
                Log in
              </Link>
            </p>
          )}
          <PricingSection
            mode="checkout"
            authenticated={Boolean(billing?.authenticated)}
            freeUsed={Boolean(billing?.freeUsed)}
            busyPlanId={busyPlanId}
            onSelectPlan={(planId, interval) => startPlanCheckout(planId, interval)}
          />
        </section>
      )}

      {script && (stage === "script-ready" || stage === "rendering") && !showPaywall && (
        <section className="fade-up" style={{ marginTop: 40 }}>
          <h2 className="script-title">{script.paperTitle}</h2>
          {(script.authors || script.journal || script.doi) && (
            <p className="script-hook" style={{ marginTop: 6, fontSize: 14, opacity: 0.85 }}>
              {[script.authors, script.journal, script.doi].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="script-hook">{script.hook}</p>
          {script.background && (
            <div className="scene-card" style={{ marginTop: 18 }}>
              <div className="scene-num">
                <SceneIcon icon="book-open" />
              </div>
              <div>
                <strong style={{ fontSize: 15.5 }}>Background</strong>
                <div style={{ color: "var(--ink-soft)", marginTop: 4, fontSize: 14, lineHeight: 1.5 }}>
                  {script.background}
                </div>
              </div>
            </div>
          )}
          <div className="scene-grid" style={{ marginTop: 22 }}>
            {script.scenes.map((s) => (
              <div key={s.index} className="scene-card">
                <div className="scene-num">
                  <SceneIcon icon={s.icon} />
                </div>
                <div>
                  <strong style={{ fontSize: 15.5 }}>{s.title}</strong>
                  {s.figureId && (
                    <div style={{ color: "var(--blue)", marginTop: 2, fontSize: 12, fontWeight: 600 }}>
                      AI remake of {s.figureId}
                      {script.figures?.find((f) => f.id === s.figureId)?.caption
                        ? ` — ${script.figures.find((f) => f.id === s.figureId)!.caption.slice(0, 80)}`
                        : ""}
                    </div>
                  )}
                  <div style={{ color: "var(--ink-soft)", marginTop: 4, fontSize: 14, lineHeight: 1.5 }}>
                    {s.narration}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <RenderOptionsPicker
            voiceId={voiceId}
            aspectRatio={aspectRatio}
            disabled={stage === "rendering"}
            onVoiceChange={setVoiceId}
            onAspectChange={setAspectRatio}
          />
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <button className="btn-generate" onClick={generateVideo} disabled={stage === "rendering"}>
              {stage === "rendering" && (
                <span
                  className="spinner"
                  style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
                />
              )}
              {stage === "rendering" ? "Rendering…" : "Generate →"}
            </button>
          </div>
        </section>
      )}

      {script && showPaywall && (
        <section className="fade-up" style={{ marginTop: 28, opacity: 0.85 }}>
          <h2 className="script-title" style={{ fontSize: 20 }}>
            {script.paperTitle}
          </h2>
          <p className="script-hook" style={{ fontSize: 14 }}>
            {script.hook}
          </p>
        </section>
      )}

      {videoUrl && stage === "done" && (
        <section className="fade-up create-result" style={{ marginTop: 40 }}>
          <div className="create-result-player">
            <video src={videoUrl} controls playsInline preload="metadata" />
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a
              href={videoUrl}
              download
              style={{
                color: "var(--blue)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14.5,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Download size={16} /> Download video
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
