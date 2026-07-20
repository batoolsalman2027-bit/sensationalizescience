import type { Metadata } from "next";
import Container from "@/components/Container";
import ProjectIntake from "@/components/figures/ProjectIntake";

export const metadata: Metadata = { title: "New project — Sensationalize Science" };

export default function NewProjectPage() {
  return (
    <section className="section" style={{ paddingTop: 44 }}>
      <Container>
        <h1 className="section-title" style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}>
          New production project
        </h1>
        <p className="section-desc" style={{ marginLeft: 0 }}>
          Upload the paper. Figures are extracted, classified, and ranked for
          review before any video work begins.
        </p>
        <ProjectIntake />
      </Container>
    </section>
  );
}
