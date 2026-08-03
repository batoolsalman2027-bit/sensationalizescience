import type { Metadata } from "next";
import { Suspense } from "react";
import Container from "@/components/Container";
import FaqAccordion from "@/components/FaqAccordion";
import ContactForm from "@/components/ContactForm";
import { FAQ_GROUPS } from "@/config/faq";

export const metadata: Metadata = { title: "FAQ · Sensationalize Science" };

export default function FaqPage() {
  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Frequently asked<span className="blue">questions</span>
          </h1>
          <p className="subhead">
            Everything about accuracy, creation, ownership, privacy, pricing, and publishing.
          </p>
        </Container>
      </section>

      <section className="section">
        <Container style={{ maxWidth: 840 }}>
          <FaqAccordion groups={FAQ_GROUPS} />
        </Container>
      </section>

      <section className="section" style={{ background: "var(--paper-2)" }} id="contact">
        <Container style={{ maxWidth: 640 }}>
          <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
            Still have a question?
          </h2>
          <p className="section-desc" style={{ marginLeft: 0, marginBottom: 22 }}>
            Something came out wrong, or your question wasn&apos;t covered above? Send us a message —
            no email client required.
          </p>
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
