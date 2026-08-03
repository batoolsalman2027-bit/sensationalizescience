"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CONTACT_SUBJECTS } from "@/config/pricing";

type Submission = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  userId: string | null;
  internalNotes: string | null;
  createdAt: number;
  resolvedAt: number | null;
};

const STATUS_OPTIONS = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
] as const;

function subjectLabel(id: string) {
  return CONTACT_SUBJECTS.find((s) => s.id === id)?.label ?? id;
}

type Props = {
  onNewCount?: (n: number) => void;
};

export default function OpsContactInbox({ onNewCount }: Props) {
  const [items, setItems] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      if (res.status === 401) {
        setError("Sign in with your operator account to view messages.");
        setItems([]);
        return;
      }
      if (res.status === 403) {
        setError("This inbox is limited to the operator account configured on the server.");
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not load messages");
      setItems(data.submissions ?? []);
      onNewCount?.(data.newCount ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [onNewCount]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setItems((list) =>
        list.map((s) => (s.id === id ? { ...s, ...data.submission } : s))
      );
      onNewCount?.(
        (await fetch("/api/contact").then((r) => r.json())).newCount ?? 0
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveNotes = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notesDraft[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save notes");
      setItems((list) =>
        list.map((s) => (s.id === id ? { ...s, ...data.submission } : s))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--ink-soft)" }}>
        <span className="spinner" style={{ marginRight: 10 }} /> Loading messages…
      </p>
    );
  }

  if (error && items.length === 0) {
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

  if (items.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>No contact messages yet.</p>;
  }

  return (
    <div className="ops-inbox">
      {error && <p style={{ color: "var(--error)", marginBottom: 16 }}>{error}</p>}
      <ul className="ops-list">
        {items.map((s) => {
          const open = selected === s.id;
          return (
            <li key={s.id} className={`ops-card${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="ops-card-head"
                onClick={() => {
                  setSelected(open ? null : s.id);
                  if (!open) {
                    setNotesDraft((m) => ({
                      ...m,
                      [s.id]: m[s.id] ?? s.internalNotes ?? "",
                    }));
                  }
                }}
              >
                <span className={`ops-status ops-status-${s.status}`}>
                  {s.status.replace("_", " ")}
                </span>
                <span className="ops-card-title">
                  {subjectLabel(s.subject)} · {s.name}
                </span>
                <span className="ops-card-meta">
                  {s.email} · {new Date(s.createdAt).toLocaleString()}
                </span>
              </button>
              {open && (
                <div className="ops-card-body">
                  <dl className="ops-dl">
                    <div>
                      <dt>From</dt>
                      <dd>
                        {s.name} &lt;{s.email}&gt;
                      </dd>
                    </div>
                    <div>
                      <dt>Subject</dt>
                      <dd>{subjectLabel(s.subject)}</dd>
                    </div>
                    <div>
                      <dt>Account</dt>
                      <dd>{s.userId ? <code>{s.userId}</code> : "Anonymous"}</dd>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <dt>Message</dt>
                      <dd style={{ whiteSpace: "pre-wrap" }}>{s.message}</dd>
                    </div>
                  </dl>

                  <div className="ops-status-row">
                    <span className="pref-label" style={{ marginBottom: 0 }}>
                      Update status
                    </span>
                    <div className="pref-chips">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pref-chip${s.status === opt.id ? " is-active" : ""}`}
                          disabled={busyId === s.id}
                          onClick={() => setStatus(s.id, opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ops-deliver">
                    <span className="pref-label">Internal notes</span>
                    <textarea
                      rows={3}
                      value={notesDraft[s.id] ?? s.internalNotes ?? ""}
                      onChange={(e) =>
                        setNotesDraft((m) => ({ ...m, [s.id]: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--line-strong)",
                        fontFamily: "inherit",
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginTop: 10 }}
                      disabled={busyId === s.id}
                      onClick={() => saveNotes(s.id)}
                    >
                      Save notes
                    </button>
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
