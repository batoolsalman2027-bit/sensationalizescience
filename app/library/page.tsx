import type { Metadata } from "next";
import Container from "@/components/Container";
import Library from "@/components/Library";

export const metadata: Metadata = {
  title: "My Library · Sensationalize Science",
  description:
    "Your private library of publication-quality research videos, visible only on your account.",
};

export default function LibraryPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <Container>
        <div style={{ marginBottom: 28 }}>
          <h1 className="section-title" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
            My Library
          </h1>
          <p className="section-desc" style={{ maxWidth: "none" }}>
            Videos produced for your account. Private to you, so other users cannot see them.
          </p>
        </div>
        <Library />
      </Container>
    </section>
  );
}
