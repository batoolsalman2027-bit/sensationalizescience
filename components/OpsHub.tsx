"use client";

import { useCallback, useEffect, useState } from "react";
import OpsInbox from "@/components/OpsInbox";
import OpsContactInbox from "@/components/OpsContactInbox";

type Tab = "requests" | "contact";

/** Operator hub: production requests + contact form inbox. */
export default function OpsHub() {
  const [tab, setTab] = useState<Tab>("requests");
  const [contactNew, setContactNew] = useState(0);

  const refreshBadge = useCallback(async () => {
    try {
      const res = await fetch("/api/contact");
      if (!res.ok) return;
      const data = (await res.json()) as { newCount?: number };
      setContactNew(data.newCount ?? 0);
    } catch {
      /* ignore — badge is best-effort */
    }
  }, []);

  useEffect(() => {
    refreshBadge();
  }, [refreshBadge]);

  return (
    <div>
      <div className="ops-tabs" role="tablist" aria-label="Operator inboxes">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requests"}
          className={`ops-tab${tab === "requests" ? " is-active" : ""}`}
          onClick={() => setTab("requests")}
        >
          Production requests
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "contact"}
          className={`ops-tab${tab === "contact" ? " is-active" : ""}`}
          onClick={() => setTab("contact")}
        >
          Contact
          {contactNew > 0 && <span className="ops-badge">{contactNew}</span>}
        </button>
      </div>

      {tab === "requests" ? (
        <OpsInbox />
      ) : (
        <OpsContactInbox onNewCount={setContactNew} />
      )}
    </div>
  );
}
