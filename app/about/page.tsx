import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import { ABOUT } from "@/config/site";

export const metadata: Metadata = { title: "About — Sensationalize Medicine" };

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Science deserves<span className="blue">a bigger audience</span>
          </h1>
          <p className="subhead">{ABOUT.mission}</p>
        </Container>
      </section>

      <section className="section">
        <Container style={{ maxWidth: 900 }}>
          <div className="grid grid-2">
            <div className="card">
              <h3>The problem we&apos;re solving</h3>
              <p>{ABOUT.problem}</p>
            </div>
            <div className="card">
              <h3>Our vision</h3>
              <p>{ABOUT.vision}</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="section" style={{ background: "var(--paper-2)" }}>
        <Container style={{ maxWidth: 760 }}>
          <SectionHeader eyebrow="Our story" title="How we started" align="left" />
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>{ABOUT.story}</p>
        </Container>
      </section>

      <section className="section">
        <Container>
          <SectionHeader eyebrow="Team" title="The people behind Sensationalize Medicine" desc="Placeholder team — replace with real members." />
          <div className="grid grid-4">
            {ABOUT.team.map((m, i) => (
              <div key={i} className="card" style={{ textAlign: "center" }}>
                <div
                  aria-hidden="true"
                  style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--blue-soft)", margin: "0 auto 12px" }}
                />
                <h3 style={{ marginBottom: 2 }}>{m.name}</h3>
                <p style={{ fontSize: 13.5 }}>{m.role}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section" style={{ textAlign: "center", background: "var(--paper-2)" }}>
        <Container>
          <h2 className="section-title" style={{ maxWidth: 640, margin: "0 auto" }}>
            Come build the future of science communication
          </h2>
          <div className="hero-ctas">
            <Button href="/resources/careers" variant="blue" large>
              View open roles
            </Button>
            <Button href="/resources/contact" variant="outline" large>
              Contact us
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
