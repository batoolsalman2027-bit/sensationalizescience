"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function destinationAfterAuth() {
    const plan = search.get("plan");
    const interval = search.get("interval") === "year" ? "year" : "month";
    const next = search.get("next") || "/create";
    if (plan === "creator" || plan === "lab") {
      const qs = new URLSearchParams({ plan, interval });
      return `${next}?${qs.toString()}`;
    }
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(destinationAfterAuth());
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const switchQs = (() => {
    const qs = search.toString();
    return qs ? `?${qs}` : "";
  })();

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Email
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid var(--line-strong)",
            fontFamily: "inherit",
            fontSize: 14.5,
          }}
        />
      </label>
      <label style={{ fontSize: 13.5, fontWeight: 600 }}>
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid var(--line-strong)",
            fontSize: 14.5,
          }}
        />
      </label>
      {error && <p style={{ color: "var(--error)", margin: 0, fontSize: 14 }}>{error}</p>}
      <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", margin: 0 }}>
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={`/signup${switchQs}`} style={{ color: "var(--blue)", fontWeight: 700 }}>
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${switchQs}`} style={{ color: "var(--blue)", fontWeight: 700 }}>
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
