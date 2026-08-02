"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UploadCloud, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import {
  BRANDING_OPTIONS,
  NARRATION_VOICES,
  OUTPUT_ASPECTS,
  SCIENTIFIC_FIELDS,
  VIDEO_LENGTHS,
  brandingNeedsLogo,
  emptyPreferences,
  type CreatePreferences,
} from "@/config/create-preferences";

type Stage = "form" | "submitting" | "done" | "error";

export default function CreateRequestForm() {
  const [prefs, setPrefs] = useState<CreatePreferences>(emptyPreferences);
  const [pdf, setPdf] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [pdfDrag, setPdfDrag] = useState(false);
  const [logoDrag, setLogoDrag] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.authenticated && d.email) {
          setSessionEmail(d.email);
          setPrefs((p) => ({ ...p, contactEmail: d.email }));
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const set = <K extends keyof CreatePreferences>(key: K, value: CreatePreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const onPdf = useCallback((file: File | undefined | null) => {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setError("Please upload a PDF of your paper");
      return;
    }
    setError(null);
    setPdf(file);
  }, []);

  const onLogo = useCallback((file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setLogo(file);
  }, []);

  const submit = async () => {
    setError(null);
    if (!sessionEmail) {
      setError("Sign in so your finished video can appear in your private library");
      return;
    }
    if (!pdf) {
      setError("Upload your paper as a PDF");
      return;
    }
    if (!prefs.scientificField) {
      setError("Select a scientific field");
      return;
    }
    if (prefs.scientificField === "Other" && !prefs.scientificFieldOther.trim()) {
      setError("Specify your scientific field");
      return;
    }
    if (!prefs.videoLength || !prefs.narrationVoice || !prefs.aspectRatio || !prefs.branding) {
      setError("Complete all preferences before submitting");
      return;
    }
    if (brandingNeedsLogo(prefs.branding) && !logo) {
      setError("Upload your lab or university logo");
      return;
    }

    setStage("submitting");
    try {
      const form = new FormData();
      form.append("pdf", pdf);
      form.append("scientificField", prefs.scientificField);
      form.append("scientificFieldOther", prefs.scientificFieldOther);
      form.append("videoLength", prefs.videoLength);
      form.append("narrationVoice", prefs.narrationVoice);
      form.append("aspectRatio", prefs.aspectRatio);
      form.append("branding", prefs.branding);
      if (logo) form.append("logo", logo);

      const res = await fetch("/api/video-requests", { method: "POST", body: form });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error(data.error ?? "Sign in to submit a production request");
      }
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setRequestId(data.id);
      setStage("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setStage("error");
    }
  };

  if (!authChecked) {
    return (
      <p style={{ color: "var(--ink-soft)" }}>
        <span className="spinner" style={{ marginRight: 10 }} /> Loading…
      </p>
    );
  }

  if (!sessionEmail) {
    return (
      <div className="card" style={{ padding: 32, maxWidth: 560 }}>
        <h2 className="section-title" style={{ fontSize: 24, marginBottom: 10 }}>
          Sign in to start a request
        </h2>
        <p className="section-desc" style={{ margin: 0, marginLeft: 0 }}>
          Production requests are tied to your account. When your video is ready, it
          appears in <strong>My Library</strong> — only you can see it.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
          <Link href="/login?next=/create" className="btn btn-gray">
            Log in
          </Link>
          <Link href="/signup?next=/create" className="btn btn-outline">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="create-success card">
        <CheckCircle2 size={36} color="var(--blue)" strokeWidth={2} />
        <h2 className="section-title" style={{ fontSize: 28, marginTop: 16 }}>
          Request received
        </h2>
        <p className="section-desc" style={{ marginLeft: 0, maxWidth: 560 }}>
          Your paper and preferences are with our scientific production team.
          When the video is ready, it will appear in{" "}
          <Link href="/library" style={{ color: "var(--blue)", fontWeight: 700 }}>
            My Library
          </Link>{" "}
          on your account only — not emailed, and not visible to other users.
        </p>
        {requestId && (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 12 }}>
            Reference: {requestId.slice(0, 8)}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/library" className="btn btn-gray">
            Go to My Library
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setStage("form");
              setPdf(null);
              setLogo(null);
              setRequestId(null);
              setPrefs((p) => ({ ...emptyPreferences(), contactEmail: sessionEmail ?? p.contactEmail }));
            }}
          >
            Submit another paper
          </button>
        </div>
      </div>
    );
  }

  const needsLogo = brandingNeedsLogo(prefs.branding);
  const busy = stage === "submitting";

  return (
    <div className="create-request">
      <p className="pref-locked-email" style={{ marginBottom: 18 }}>
        Signed in as <strong>{sessionEmail}</strong>. Finished videos appear in{" "}
        <Link href="/library" style={{ color: "var(--blue)", fontWeight: 600 }}>
          My Library
        </Link>
        .
      </p>

      <label
        className={`dropzone${busy ? " dropzone-disabled" : ""}${pdfDrag ? " dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setPdfDrag(true);
        }}
        onDragLeave={() => setPdfDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setPdfDrag(false);
          if (!busy) onPdf(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          disabled={busy}
          onChange={(e) => onPdf(e.target.files?.[0])}
        />
        <div className="upload-badge">
          <UploadCloud size={30} color="var(--blue)" strokeWidth={2} />
        </div>
        <div style={{ fontSize: 19, marginBottom: 8, fontWeight: 700 }}>
          {pdf?.name ?? "Drop your paper here, or click to upload"}
        </div>
        <div style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
          Full PDF — preprints, accepted manuscripts, or published papers
        </div>
      </label>

      <div className="pref-panel">
        <h3 className="pref-panel-title">Production preferences</h3>
        <p className="pref-panel-desc">
          Set these before you submit. Our team uses them to produce your video —
          it will show up in your private library when ready.
        </p>

        <div className="pref-group">
          <label className="pref-label" htmlFor="scientificField">
            1. Scientific field
          </label>
          <select
            id="scientificField"
            className="pref-select"
            disabled={busy}
            value={prefs.scientificField}
            onChange={(e) => set("scientificField", e.target.value as CreatePreferences["scientificField"])}
          >
            <option value="">Select a field</option>
            {SCIENTIFIC_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {prefs.scientificField === "Other" && (
            <input
              type="text"
              className="pref-input"
              placeholder="Describe your field"
              disabled={busy}
              value={prefs.scientificFieldOther}
              onChange={(e) => set("scientificFieldOther", e.target.value)}
            />
          )}
        </div>

        <div className="pref-group">
          <div className="pref-label">2. Video length</div>
          <div className="pref-chips pref-chips-length">
            {VIDEO_LENGTHS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`pref-chip${prefs.videoLength === v.id ? " is-active" : ""}`}
                disabled={busy}
                onClick={() => set("videoLength", v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <div className="pref-label">3. Narration voice</div>
          <div className="pref-chips pref-chips-voice">
            {NARRATION_VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`pref-chip${prefs.narrationVoice === v.id ? " is-active" : ""}`}
                disabled={busy}
                onClick={() => set("narrationVoice", v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <div className="pref-label">4. Output aspect ratio</div>
          <div className="pref-chips pref-chips-aspect">
            {OUTPUT_ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`pref-chip pref-chip-wide${prefs.aspectRatio === a.id ? " is-active" : ""}`}
                disabled={busy}
                onClick={() => set("aspectRatio", a.id)}
              >
                <span className="pref-chip-title">{a.label}</span>
                <span className="pref-chip-hint">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <div className="pref-label">5. Branding</div>
          <div className="pref-chips pref-chips-branding">
            {BRANDING_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`pref-chip${prefs.branding === b.id ? " is-active" : ""}`}
                disabled={busy}
                onClick={() => {
                  set("branding", b.id);
                  if (b.id === "none") setLogo(null);
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
          {needsLogo && (
            <label
              className={`logo-dropzone${busy ? " dropzone-disabled" : ""}${
                logoDrag ? " dropzone-active" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setLogoDrag(true);
              }}
              onDragLeave={() => setLogoDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setLogoDrag(false);
                if (!busy) onLogo(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                disabled={busy}
                onChange={(e) => onLogo(e.target.files?.[0])}
              />
              <ImageIcon size={22} color="var(--blue)" strokeWidth={2} />
              <span>
                {logo?.name ??
                  (prefs.branding === "university"
                    ? "Drop your university logo, or click to upload"
                    : "Drop your lab logo, or click to upload")}
              </span>
            </label>
          )}
        </div>
      </div>

      {(error || stage === "error") && (
        <p style={{ color: "var(--error)", marginTop: 18, textAlign: "center" }}>{error}</p>
      )}

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <button
          type="button"
          className="btn btn-gray btn-lg"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Submitting…" : "Submit for production"}
        </button>
      </div>
    </div>
  );
}
