import { Check, ShieldCheck, Quote, Pencil, Building2, ArrowRight } from "lucide-react";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeader from "@/components/SectionHeader";
import FeatureCard from "@/components/FeatureCard";
import HeroWorkflow from "@/components/HeroWorkflow";
import HeroHeadline from "@/components/HeroHeadline";
import Reveal from "@/components/Reveal";
import {
  HERO,
  HOW_IT_WORKS,
  CORE_FEATURES,
  ACCURACY_POINTS,
  FINAL_CTA,
} from "@/config/site";

const TRUST = [
  { icon: ShieldCheck, label: "Private by default", body: "Your unpublished research stays confidential and is never used to train models." },
  { icon: Quote, label: "Citations preserved", body: "References and terminology carry through to the final narration." },
  { icon: Pencil, label: "You approve every edit", body: "Review the script, visuals, and voice before anything exports." },
  { icon: Building2, label: "Institution-ready", body: "Workflows built for labs, journals, and universities." },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <Container>
          <div className="home-hero-copy fade-up">
            <span className="eyebrow">AI for scientific communication</span>
            <HeroHeadline lead={HERO.headline[0]} />
            <p className="subhead">{HERO.subheadline}</p>
            <div className="hero-ctas">
              <Button href={HERO.primaryCta.href} variant="blue" large>
                {HERO.primaryCta.label} <ArrowRight size={17} />
              </Button>
              <Button href={HERO.secondaryCta.href} variant="outline" large>
                {HERO.secondaryCta.label}
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="section how-it-works">
        <Container>
          <Reveal>
            <div className="hero-demo">
              <div className="hero-demo-intro">
                <span className="eyebrow">How it works</span>
                <h2 className="section-title">From paper to published in four steps</h2>
                <p className="section-desc">
                  A guided workflow that keeps you in control the whole way through.
                </p>
              </div>
              <div className="grid grid-4">
                {HOW_IT_WORKS.map((s) => (
                  <div key={s.step} className="card">
                    <div className="step-num">{String(s.step).padStart(2, "0")}</div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                ))}
              </div>
              <HeroWorkflow />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Features ---------- */}
      <section className="section">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Platform"
              title="Purpose-built for research"
              desc="Every part of the pipeline is tuned for scientific accuracy and clarity."
              nowrap
            />
          </Reveal>
          <Reveal>
            <div className="grid grid-4">
              {CORE_FEATURES.map((c) => (
                <FeatureCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Accuracy & trust ---------- */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <Container>
          <div className="split">
            <Reveal>
              <span className="eyebrow">Accuracy & control</span>
              <h2 className="section-title">You stay the scientist. AI does the production.</h2>
              <p className="section-desc" style={{ marginLeft: 0 }}>
                Nothing publishes without your sign-off. Edit the script, visuals, citations, terminology, and narration until it&apos;s exactly right.
              </p>
              <div className="hero-ctas" style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <Button href="/create" variant="blue">Try it on your paper</Button>
              </div>
            </Reveal>
            <Reveal>
              <div className="card" style={{ padding: 28 }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 15 }}>
                  {ACCURACY_POINTS.map((p) => (
                    <li key={p} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15.5 }}>
                      <Check size={18} strokeWidth={2.5} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="grid grid-4" style={{ marginTop: 26 }}>
              {TRUST.map((t) => (
                <div key={t.label} className="card feature-card">
                  <div className="icon-badge" aria-hidden="true"><t.icon size={20} strokeWidth={1.75} /></div>
                  <h3>{t.label}</h3>
                  <p>{t.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Pricing preview ---------- */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <Container>
          <Reveal>
            <span className="eyebrow">Pricing</span>
            <h2 className="section-title">Start free. Scale when you publish more.</h2>
            <p className="section-desc" style={{ whiteSpace: "nowrap", maxWidth: "none" }}>
              Create your first video for free, with plans for creators, labs, and institutions when you&apos;re ready to upgrade
            </p>
            <div className="hero-ctas">
              <Button href="/pricing" variant="blue" large>See pricing</Button>
              <Button href="/create" variant="outline" large>Start free</Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="section">
        <Container>
          <Reveal>
            <h2 className="headline" style={{ fontSize: "clamp(34px, 5.5vw, 68px)" }}>
              {FINAL_CTA.headline}
            </h2>
            <div className="hero-ctas">
              <Button href={FINAL_CTA.cta.href} variant="blue" large>
                {FINAL_CTA.cta.label} <ArrowRight size={17} />
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
