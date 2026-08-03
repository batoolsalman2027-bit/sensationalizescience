"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_NAV } from "@/config/navigation";

type BillingStatus = {
  authenticated: boolean;
  email: string | null;
  credits: number;
  unlimited?: boolean;
};

type Props = {
  /** Compact row for the mobile drawer. */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

function creditLabel(status: BillingStatus): string {
  if (status.unlimited) return "Unlimited";
  const n = status.credits;
  return `${n} credit${n === 1 ? "" : "s"}`;
}

function shortEmail(email: string): string {
  if (email.length <= 22) return email;
  const [user, domain] = email.split("@");
  if (!domain) return `${email.slice(0, 18)}…`;
  const u = user.length > 10 ? `${user.slice(0, 8)}…` : user;
  return `${u}@${domain}`;
}

/**
 * Always-visible account strip in the site header.
 * Signed-in: email + credit balance (links to My Library) + log out.
 * Signed-out: Log in / Sign up.
 * Refreshes on route change and window focus so purchases stay current.
 */
export default function NavAccount({ variant = "desktop", onNavigate }: Props) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (!res.ok) {
        setStatus(null);
        return;
      }
      const data = (await res.json()) as BillingStatus;
      setStatus(data.authenticated && data.email ? data : null);
    } catch {
      setStatus(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => refresh();
    const onBilling = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("billing:refresh", onBilling);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("billing:refresh", onBilling);
    };
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus(null);
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return variant === "desktop" ? <div className="nav-account nav-account-loading" aria-hidden /> : null;
  }

  if (!status?.email) {
    if (variant === "mobile") {
      return (
        <>
          <Link href={AUTH_NAV.login.href} className="btn btn-outline btn-lg" onClick={onNavigate}>
            {AUTH_NAV.login.label}
          </Link>
          <Link href={AUTH_NAV.getStarted.href} className="btn btn-gray btn-lg" onClick={onNavigate}>
            {AUTH_NAV.getStarted.label}
          </Link>
        </>
      );
    }
    return (
      <>
        <Link href={AUTH_NAV.login.href} className="btn btn-ghost">
          {AUTH_NAV.login.label}
        </Link>
        <Link href={AUTH_NAV.getStarted.href} className="btn btn-gray">
          {AUTH_NAV.getStarted.label}
        </Link>
      </>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="nav-account nav-account-mobile">
        <div className="nav-account-meta">
          <span className="nav-account-email">{status.email}</span>
          <Link href="/pricing" className="nav-account-credits" onClick={onNavigate}>
            {creditLabel(status)}
          </Link>
        </div>
        <div className="nav-account-actions">
          <Link href="/library" className="btn btn-outline" onClick={onNavigate}>
            My Library
          </Link>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-account" title={`${status.email} · ${creditLabel(status)}`}>
      <Link href="/library" className="nav-account-chip">
        <span className="nav-account-email">{shortEmail(status.email)}</span>
        <span className="nav-account-sep" aria-hidden>
          ·
        </span>
        <span className="nav-account-credits">{creditLabel(status)}</span>
      </Link>
      <button type="button" className="btn btn-ghost nav-account-logout" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
