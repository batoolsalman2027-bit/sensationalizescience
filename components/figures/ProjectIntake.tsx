"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, UploadCloud } from "lucide-react";

type Stage = "idle" | "uploading" | "error";

/**
 * Creates a production project from a paper.
 *
 * Extraction and analysis run inside the POST, so this can take a minute on a
 * figure-heavy paper. The waiting state names the stages rather than showing a
 * bare spinner, since an operator needs to know whether it is still working.
 */
export default function ProjectIntake() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  // Frontend-only preview: no backend pipeline. Route to a sample project so the
  // reviewer UI is still reachable, instead of uploading and analyzing the PDF.
  const submit = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      setFileName(file.name);
      setError(null);
      router.push("/projects/demo-synapse");
    },
    [router]
  );

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF.");
        setStage("error");
        return;
      }
      submit(file);
    },
    [submit]
  );

  const busy = stage === "uploading";

  return (
    <div className="intake">
      <label className="intake-field">
        <span>Intended narrative (optional)</span>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="e.g. Synapses that respond to stimulation are physically more stable and survive longer."
          rows={3}
          disabled={busy}
        />
        <small>
          Figures are scored partly on how well they support this. Leave blank to
          score against the paper&apos;s central claim instead.
        </small>
      </label>

      <div
        className={`intake-drop${dragActive ? " active" : ""}${busy ? " busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!busy) onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          id="paper-upload"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        {busy ? (
          <div className="intake-busy" role="status" aria-live="polite">
            <Loader2 size={26} className="qc-spin" aria-hidden="true" />
            <strong>Analyzing {fileName}</strong>
            <p>
              Extracting figures, classifying each one, and ranking them. This
              usually takes under a minute.
            </p>
          </div>
        ) : (
          <>
            <div className="upload-badge" aria-hidden="true">
              <UploadCloud size={28} strokeWidth={1.75} />
            </div>
            <label htmlFor="paper-upload" className="intake-cta">
              Choose a PDF
            </label>
            <p>or drag it here — text-based PDFs only, scans need OCR first</p>
          </>
        )}
      </div>

      {error && (
        <div className="intake-error" role="alert">
          <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
          {lastFileRef.current && (
            <button type="button" onClick={() => submit(lastFileRef.current!)}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
