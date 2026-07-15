import type { Metadata } from "next";
import Container from "@/components/Container";
import FaqAccordion from "@/components/FaqAccordion";
import { FAQ_GROUPS } from "@/config/faq";

export const metadata: Metadata = { title: "FAQ — Sensationalize Science" };

export default function FaqPage() {
  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Frequently asked<span className="blue">questions</span>
          </h1>
          <p className="subhead">Everything about accuracy, creation, ownership, privacy, pricing, and publishing.</p>
        </Container>
      </section>

      <section className="section">
        <Container style={{ maxWidth: 840 }}>
          <FaqAccordion groups={FAQ_GROUPS} />
        </Container>
      </section>
    </>
  );
}
