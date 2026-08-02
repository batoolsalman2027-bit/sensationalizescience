import type { Metadata } from "next";
import Container from "@/components/Container";
import OpsInbox from "@/components/OpsInbox";

export const metadata: Metadata = {
  title: "Operator inbox — Sensationalize Science",
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
            Production requests
          </h1>
          <p className="section-desc" style={{ marginLeft: 0 }}>
            Submissions from Create land here for your operator account only. Download the
            paper and logo, produce the video to their preferences, then upload the MP4 to
            publish it into <strong>that user&apos;s private My Library</strong>.
          </p>
        </div>
        <OpsInbox />
      </Container>
    </section>
  );
}
