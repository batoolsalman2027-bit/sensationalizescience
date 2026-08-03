import type { Metadata } from "next";
import { Suspense } from "react";
import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact · Sensationalize Science" };

export default function ContactPage() {
  return (
    <section className="page-hero">
      <Container style={{ maxWidth: 640 }}>
        <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
          Contact<span className="blue">we&apos;d love to hear from you</span>
        </h1>
        <p className="subhead">
          Questions about a project, pricing, bulk credits, or a video that came out wrong? Send a
          message and we&apos;ll reply within 2 business days.
        </p>
        <div style={{ marginTop: 28 }}>
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
