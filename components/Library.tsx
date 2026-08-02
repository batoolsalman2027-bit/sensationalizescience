"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

interface LibVideo {
  id: string;
  title?: string;
  videoUrl: string;
  createdAt: number;
}

export default function Library() {
  const [videos, setVideos] = useState<LibVideo[] | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetch("/api/library")
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 401) {
          setNeedsAuth(true);
          setVideos([]);
          return;
        }
        setVideos(d.videos ?? []);
      })
      .catch(() => setVideos([]));
  }, []);

  if (videos === null) {
    return (
      <div className="lib-empty">
        <span className="spinner" style={{ display: "inline-block" }} />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="lib-empty">
        <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
          Sign in to view your library
        </p>
        <p style={{ marginTop: 6, maxWidth: 420 }}>
          Each account has a private library. Sign in to see videos produced for you.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 18, justifyContent: "center" }}>
          <Link href="/login?next=/library" className="btn btn-gray">
            Log in
          </Link>
          <Link href="/signup?next=/library" className="btn btn-outline">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="lib-empty">
        <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
          No videos yet
        </p>
        <p style={{ marginTop: 6, maxWidth: 480 }}>
          Submit a paper from <strong>Create</strong>. When production is complete, your
          publication-quality video appears here — only on your account.
        </p>
        <Link href="/create" className="btn btn-gray" style={{ marginTop: 18 }}>
          Start a production request
        </Link>
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
              gap: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {v.title || "Research video"}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>
                {new Date(v.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
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
                flexShrink: 0,
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
