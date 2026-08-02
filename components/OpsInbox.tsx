"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { VIDEO_LENGTHS } from "@/config/create-preferences";

type RequestSummary = {
  id: string;
  status: string;
  contactEmail: string;
  scientificField: string;
  videoLength: string;
  narrationVoice: string;
  aspectRatio: string;
  branding: string;
  sourceFileName: string;
  hasLogo: boolean;
  libraryJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

const STATUS_OPTIONS = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "archived", label: "Archived" },
] as const;

function lengthLabel(id: string) {
  return VIDEO_LENGTHS.find((v) => v.id === id)?.label ?? id;
}

function brandingLabel(id: string) {
  if (id === "lab_logo") return "Lab logo";
  if (id === "university") return "University branding";
  if (id === "none") return "No branding";
  return id;
}

export default function OpsInbox() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deliverFile, setDeliverFile] = useState<Record<string, File | null>>({});
  const [deliverNote, setDeliverNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video-requests");
      const data = await res.json();
      if (res.status === 401) {
        setError("Sign in with your operator account to view requests.");
        setRequests([]);
        return;
      }
      if (res.status === 403) {
        setError("This inbox is limited to the operator account configured on the server.");
        setRequests([]);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not load requests");
      setRequests(data.requests ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deliverVideo = async (id: string) => {
    const file = deliverFile[id];
    if (!file) {
      setError("Choose an MP4 to deliver to their library");
      return;
    }
    setBusyId(id);
    setDeliverNote(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("video", file);
      const res = await fetch(`/api/video-requests/${id}/deliver`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delivery failed");
      setRequests((list) =>
        list.map((r) =>
          r.id === id
            ? {
                ...r,
                status: data.request.status,
                libraryJobId: data.request.libraryJobId,
                updatedAt: data.request.updatedAt,
              }
            : r
        )
      );
      setDeliverFile((m) => ({ ...m, [id]: null }));
      setDeliverNote("Video added to that user’s private library.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delivery failed");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/video-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setRequests((list) =>
        list.map((r) =>
          r.id === id ? { ...r, status: data.request.status, updatedAt: data.request.updatedAt } : r
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--ink-soft)" }}>
        <span className="spinner" style={{ marginRight: 10 }} /> Loading requests…
      </p>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="card" style={{ padding: 28, maxWidth: 520 }}>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>{error}</p>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <Link href="/login" className="btn btn-gray">
            Log in
          </Link>
          <button type="button" className="btn btn-outline" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>No production requests yet.</p>;
  }

  return (
    <div className="ops-inbox">
      {error && <p style={{ color: "var(--error)", marginBottom: 16 }}>{error}</p>}
      {deliverNote && <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>{deliverNote}</p>}
      <ul className="ops-list">
        {requests.map((r) => {
          const open = selected === r.id;
          return (
            <li key={r.id} className={`ops-card${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="ops-card-head"
                onClick={() => setSelected(open ? null : r.id)}
              >
                <span className={`ops-status ops-status-${r.status}`}>{r.status.replace("_", " ")}</span>
                <span className="ops-card-title">{r.sourceFileName}</span>
                <span className="ops-card-meta">
                  {r.contactEmail} · {new Date(r.createdAt).toLocaleString()}
                </span>
              </button>
              {open && (
                <div className="ops-card-body">
                  <dl className="ops-dl">
                    <div>
                      <dt>Field</dt>
                      <dd>{r.scientificField}</dd>
                    </div>
                    <div>
                      <dt>Length</dt>
                      <dd>{lengthLabel(r.videoLength)}</dd>
                    </div>
                    <div>
                      <dt>Voice</dt>
                      <dd style={{ textTransform: "capitalize" }}>{r.narrationVoice}</dd>
                    </div>
                    <div>
                      <dt>Aspect</dt>
                      <dd>{r.aspectRatio}</dd>
                    </div>
                    <div>
                      <dt>Branding</dt>
                      <dd>{brandingLabel(r.branding)}</dd>
                    </div>
                    <div>
                      <dt>Account</dt>
                      <dd>{r.contactEmail}</dd>
                    </div>
                    <div>
                      <dt>Request ID</dt>
                      <dd>
                        <code>{r.id}</code>
                      </dd>
                    </div>
                  </dl>

                  <div className="ops-actions">
                    <a className="btn btn-outline" href={`/api/video-requests/${r.id}?asset=pdf`}>
                      Download PDF
                    </a>
                    {r.hasLogo && (
                      <a className="btn btn-outline" href={`/api/video-requests/${r.id}?asset=logo`}>
                        Download logo
                      </a>
                    )}
                    {r.libraryJobId && (
                      <a className="btn btn-outline" href={`/api/renders/${r.libraryJobId}`}>
                        Preview delivered video
                      </a>
                    )}
                  </div>

                  <div className="ops-deliver">
                    <span className="pref-label">Deliver to their My Library</span>
                    <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--ink-soft)" }}>
                      Upload the finished MP4. It will appear only in this user’s private library —
                      not emailed, and not visible to other accounts.
                    </p>
                    <div className="ops-actions">
                      <input
                        type="file"
                        accept="video/mp4,video/*"
                        disabled={busyId === r.id}
                        onChange={(e) =>
                          setDeliverFile((m) => ({ ...m, [r.id]: e.target.files?.[0] ?? null }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-gray"
                        disabled={busyId === r.id || !deliverFile[r.id]}
                        onClick={() => deliverVideo(r.id)}
                      >
                        {busyId === r.id ? "Uploading…" : "Publish to their library"}
                      </button>
                    </div>
                    {deliverFile[r.id] && (
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
                        Selected: {deliverFile[r.id]?.name}
                      </p>
                    )}
                  </div>

                  <div className="ops-status-row">
                    <span className="pref-label" style={{ marginBottom: 0 }}>
                      Update status
                    </span>
                    <div className="pref-chips">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`pref-chip${r.status === s.id ? " is-active" : ""}`}
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r.id, s.id)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
