import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import { MAIN_NAV } from "@/config/navigation";

export const metadata: Metadata = { title: "Enterprise — Sensationalize Medicine" };

export default function EnterprisePage() {
  const enterprise = MAIN_NAV.find((i) => i.label === "Enterprise");
  const items = (enterprise?.sections ?? []).flatMap((s) => s.items);

  return (
    <>
      <section className="page-hero">
        <Container>
          <h1 className="headline" style={{ fontSize: "clamp(40px, 7vw, 84px)" }}>
            Science communication<span className="blue">at institutional scale</span>
          </h1>
          <p className="subhead">
            For universities, institutes, journals, publishers, and biotech — with the security, branding, and volume you need.
          </p>
          <div className="hero-ctas">
            <Button href="/enterprise/contact-sales" variant="blue" large>Contact Sales</Button>
          </div>
        </Container>
      </section>

      <section className="section">
        <Container>
          <div className="grid grid-3">
            {items.map((leaf) => (
              <Link key={leaf.href + leaf.label} href={leaf.href} className="card" style={{ textDecoration: "none" }}>
                <h3>{leaf.label}</h3>
                <p>{leaf.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
