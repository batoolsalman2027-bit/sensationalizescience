import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeader from "@/components/SectionHeader";
import ProductionWorkflow from "@/components/ProductionWorkflow";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import FeatureCarousel from "@/components/ui/FeatureCarousel";

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <HomeHero />

      {/* ---------- Production workflow ---------- */}
      <section className="section how-it-works" aria-labelledby="workflow-heading">
        <Container>
          <Reveal>
            <div className="wf-intro">
              <span className="eyebrow">The production process</span>
              <h2 className="section-title wf-heading-oneline" id="workflow-heading">
                How a paper becomes a publication-quality video
              </h2>
              <p className="section-desc">
                Six stages, with AI-assisted scientific editors and video-production
                tools at every step, and your lab&apos;s approval before anything ships.
              </p>
            </div>
          </Reveal>
          <ProductionWorkflow />
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
              descNowrap
            />
          </Reveal>
          <Reveal>
            <FeatureCarousel />
          </Reveal>
        </Container>
      </section>

      {/* ---------- Pricing preview ---------- */}
      <section className="section">
        <Container>
          <Reveal>
            <span className="eyebrow">Pricing</span>
            <h2 className="section-title">One credit. One finished video.</h2>
            <p className="section-desc" style={{ maxWidth: "none" }}>
              Start with one free video, then buy credits in packs — from a single paper to a full department. Credits never expire.
            </p>
            <div className="hero-ctas">
              <Button href="/pricing" variant="blue" large>See pricing</Button>
              <Button href="/create" variant="outline" large>Start free</Button>
            </div>
          </Reveal>
        </Container>
      </section>

    </>
  );
}
