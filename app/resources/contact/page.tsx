import type { Metadata } from "next";
import Container from "@/components/Container";
import Button from "@/components/Button";

export const metadata: Metadata = { title: "Contact · Sensationalize Science" };

const EMAIL = "batoolsalman2027@u.northwestern.edu";

export default function ContactPage() {
  return (
    <section className="page-hero">
      <Container>
        <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
          Contact<span className="blue">we&apos;d love to hear from you</span>
        </h1>
        <p className="subhead">
          Questions about a project, pricing, or a video that came out wrong? Reach the team directly
          and we&apos;ll get back to you.
        </p>
        <div className="hero-ctas">
          <Button href={`mailto:${EMAIL}`} variant="blue" large>
            Email us
          </Button>
        </div>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 16 }}>
          Or write to us at{" "}
          <a href={`mailto:${EMAIL}`} style={{ color: "var(--blue)" }}>
            {EMAIL}
          </a>
          .
        </p>
      </Container>
    </section>
  );
}
