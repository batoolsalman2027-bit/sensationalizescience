import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = { title: "Resources · Sensationalize Science" };

const LINKS = [
  { label: "FAQ", href: "/faq", blurb: "Answers on accuracy, creation, ownership, pricing, and publishing." },
  { label: "Contact", href: "/resources/contact", blurb: "Reach the team about a project, pricing, or a video." },
];

export default function ResourcesPage() {
  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Resources<span className="blue">answers and support</span>
          </h1>
          <p className="subhead">Everything you need to get help and get started.</p>
        </Container>
      </section>

      <section className="section">
        <Container>
          <div className="grid grid-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="card" style={{ textDecoration: "none" }}>
                <h3>{l.label}</h3>
                <p>{l.blurb}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
