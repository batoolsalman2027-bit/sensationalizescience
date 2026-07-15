import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Uploader from "@/components/Uploader";

export const metadata: Metadata = { title: "Create — Sensationalize Medicine" };

export default function CreatePage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <Container>
        <div style={{ marginBottom: 8 }}>
          <h1 className="section-title" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
            Create a video
          </h1>
          <p className="section-desc">Upload a text-based PDF and we&apos;ll turn it into a short, narrated video.</p>
          <p style={{ marginTop: 6, fontSize: 14 }}>
            <Link href="/library" style={{ color: "var(--blue)", fontWeight: 700 }}>
              View your library
            </Link>
          </p>
        </div>
        <Uploader />
      </Container>
    </section>
  );
}
