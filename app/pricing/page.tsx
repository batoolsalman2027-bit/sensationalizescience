import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeader from "@/components/SectionHeader";
import PricingSection from "@/components/PricingSection";
import ComparisonTable from "@/components/ComparisonTable";
import FaqAccordion from "@/components/FaqAccordion";
import { PRICING_FAQ } from "@/config/pricing";

export const metadata: Metadata = { title: "Pricing · Sensationalize Science" };

export default function PricingPage() {
  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Simple pricing<span className="blue">for every scientist</span>
          </h1>
          <p className="subhead">
            One credit equals one finished video. Start free, then buy credits when you&apos;re
            ready — they never expire.
          </p>
        </Container>
      </section>

      <section className="section-sm">
        <Container>
          <PricingSection />
        </Container>
      </section>

      <section className="section">
        <Container>
          <SectionHeader eyebrow="Included" title="What every credit includes" />
          <ComparisonTable />
        </Container>
      </section>

      <section className="section" style={{ background: "var(--paper-2)" }}>
        <Container style={{ maxWidth: 820 }}>
          <SectionHeader eyebrow="Pricing FAQ" title="Questions about pricing" />
          <FaqAccordion
            groups={[{ category: "Pricing", questions: PRICING_FAQ }]}
            showCategories={false}
          />
        </Container>
      </section>
    </>
  );
}
