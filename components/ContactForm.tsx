"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import {
  CONTACT_SUBJECTS,
  type ContactSubjectId,
} from "@/config/pricing";

type Props = {
  /** Optional heading above the form. */
  title?: string;
  /** Force a subject (e.g. from Custom pack CTA). */
  defaultSubject?: ContactSubjectId;
};

export default function ContactForm({ title, defaultSubject }: Props) {
  const search = useSearchParams();
  const subjectFromQuery = search.get("subject");

  const initialSubject = ((): ContactSubjectId => {
    if (defaultSubject) return defaultSubject;
    if (CONTACT_SUBJECTS.some((s) => s.id === subjectFromQuery)) {
      return subjectFromQuery as ContactSubjectId;
    }
    return "other";
  })();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<ContactSubjectId>(initialSubject);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        if (!res.ok) return;
        const data = (await res.json()) as { email?: string | null };
        if (!cancelled && data.email) {
          setEmail((prev) => prev || data.email || "");
        }
      } catch {
        /* ignore — form still works anonymously */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (CONTACT_SUBJECTS.some((s) => s.id === subjectFromQuery)) {
      setSubject(subjectFromQuery as ContactSubjectId);
    }
  }, [subjectFromQuery]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessEmail(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website: honeypot,
        }),
      });
      const data = (await res.json()) as { error?: string; email?: string; ok?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Could not send message");
      setSuccessEmail(data.email ?? email);
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  if (successEmail) {
    return (
      <div className="card" style={{ padding: 28 }}>
        {title && (
          <h2 className="section-title" style={{ fontSize: 22, marginBottom: 12 }}>
            {title}
          </h2>
        )}
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55 }}>
          Got it — we&apos;ll reply to <strong>{successEmail}</strong> within 2 business days.
        </p>
        <button
          type="button"
          className="btn btn-outline"
          style={{ marginTop: 18 }}
          onClick={() => setSuccessEmail(null)}
        >
          Send another message
        </button>
      </div>
    );
  }

  const fieldStyle: CSSProperties = {
    width: "100%",
    marginTop: 6,
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid var(--line-strong)",
    fontFamily: "inherit",
    fontSize: 14.5,
  };

  return (
    <form
      onSubmit={onSubmit}
      className="card"
      style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}
      noValidate
    >
      {title && (
        <h2 className="section-title" style={{ fontSize: 22, marginBottom: 4 }}>
          {title}
        </h2>
      )}

      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Name
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          style={fieldStyle}
        />
      </label>

      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          style={fieldStyle}
        />
      </label>

      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Subject
        <select
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value as ContactSubjectId)}
          style={fieldStyle}
        >
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Message
        <textarea
          required
          minLength={20}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you need — at least a sentence or two."
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>

      {/* Honeypot — hidden from users */}
      <label
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", height: 0, overflow: "hidden" }}
      >
        Website
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </label>

      {error && (
        <p style={{ color: "var(--error)", margin: 0, fontSize: 14 }} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-blue" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? (
          <>
            <span className="spinner" style={{ marginRight: 8 }} /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </button>
    </form>
  );
}
