"use client";

import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import RenderOptionsPicker from "@/components/RenderOptionsPicker";
import {
  ASPECT_RATIOS,
  VOICES,
  type AspectRatioId,
} from "@/config/render-options";

/**
 * Frontend-only preview of the "Create a video" flow.
 *
 * The real uploader talks to /api/script and /api/video and polls a render job.
 * Those routes and the AI/video pipeline are removed in this build, so this
 * keeps the dropzone and render-options UI but does not upload or generate.
 */
export default function Uploader() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>(ASPECT_RATIOS[0].id);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.type === "application/pdf") handleFile(f);
    },
    [handleFile]
  );

  return (
    <div>
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
        <div style={{ color: "var(--ink-soft)" }}>
          Frontend preview — video generation is disabled in this build.
        </div>
      </div>

      <label
        className={`dropzone${dragActive ? " dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
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

      <section className="fade-up" style={{ marginTop: 32 }}>
        <RenderOptionsPicker
          voiceId={voiceId}
          aspectRatio={aspectRatio}
          disabled={false}
          onVoiceChange={setVoiceId}
          onAspectChange={setAspectRatio}
        />
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <button className="btn-generate" disabled title="Disabled in the frontend preview">
            Generate →
          </button>
        </div>
      </section>
    </div>
  );
}
