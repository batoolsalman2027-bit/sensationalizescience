import type { Metadata } from "next";
import Container from "@/components/Container";
import Library from "@/components/Library";

export const metadata: Metadata = { title: "Your library — Sensationalize Medicine" };

export default function LibraryPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <Container>
        <div style={{ marginBottom: 28 }}>
          <h1 className="section-title" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
            Your library
          </h1>
          <p className="section-desc">Every video you&apos;ve rendered, ready to download or share.</p>
        </div>
        <Library />
      </Container>
    </section>
  );
}
