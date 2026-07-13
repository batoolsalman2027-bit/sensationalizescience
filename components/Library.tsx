"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface LibVideo {
  id: string;
  videoUrl: string;
  createdAt: number;
}

export default function Library() {
  const [videos, setVideos] = useState<LibVideo[] | null>(null);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos ?? []))
      .catch(() => setVideos([]));
  }, []);

  if (videos === null) {
    return (
      <div className="lib-empty">
        <span className="spinner" style={{ display: "inline-block" }} />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="lib-empty">
        <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
          No videos yet
        </p>
        <p style={{ marginTop: 6 }}>
          Head to <strong>Create New</strong> and upload a paper — your rendered
          reels will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="lib-grid">
      {videos.map((v) => (
        <div key={v.id} className="lib-card">
          <video src={v.videoUrl} controls preload="metadata" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
            }}
          >
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>
              {new Date(v.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <a
              href={v.videoUrl}
              download
              style={{
                color: "var(--blue)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Download size={14} /> Save
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
