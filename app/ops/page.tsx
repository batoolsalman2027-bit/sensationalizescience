import type { Metadata } from "next";
import Container from "@/components/Container";
import OpsHub from "@/components/OpsHub";

export const metadata: Metadata = {
  title: "Operator inbox · Sensationalize Science",
  robots: { index: false, follow: false },
};

/**
 * Developer / operator inbox. Not linked in public nav.
 * Access is gated server-side to emails in OPERATOR_EMAILS.
 */
export default function OpsPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <Container>
        <div style={{ marginBottom: 28, maxWidth: 640 }}>
          <span className="eyebrow">Operator</span>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
            Inbox
          </h1>
          <p className="section-desc" style={{ marginLeft: 0 }}>
            Production requests from Create and messages from the contact form. Deliver videos into
            each user&apos;s private My Library; reply to contact messages out of band and mark them
            resolved here.
          </p>
        </div>
        <OpsHub />
      </Container>
    </section>
  );
}
