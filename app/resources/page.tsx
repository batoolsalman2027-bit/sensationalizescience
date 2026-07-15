import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import { MAIN_NAV } from "@/config/navigation";

export const metadata: Metadata = { title: "Resources — Sensationalize Medicine" };

export default function ResourcesPage() {
  const resources = MAIN_NAV.find((i) => i.label === "Resources");
  const sections = resources?.sections ?? [];

  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Resources<span className="blue">learn, build, connect</span>
          </h1>
          <p className="subhead">Guides, docs, company info, and community programs for science creators.</p>
        </Container>
      </section>

      <section className="section">
        <Container>
          <div className="grid grid-3">
            {sections.map((section) => (
              <div key={section.heading} className="card">
                <h3 style={{ marginBottom: 12 }}>{section.heading}</h3>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {section.items.map((leaf) => (
                    <Link
                      key={leaf.href + leaf.label}
                      href={leaf.href}
                      style={{ color: "var(--ink-soft)", textDecoration: "none", padding: "7px 0", fontSize: 14.5 }}
                    >
                      {leaf.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
