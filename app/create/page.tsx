import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import CreateRequestForm from "@/components/CreateRequestForm";

export const metadata: Metadata = {
  title: "Create — Sensationalize Science",
  description:
    "Upload your paper and production preferences. Your finished publication-quality video appears in My Library on your account.",
};

export default function CreatePage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <Container>
        <div style={{ marginBottom: 28 }}>
          <h1 className="section-title" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
            Start a production request
          </h1>
          <p className="section-desc" style={{ marginLeft: 0, maxWidth: "none" }}>
            Upload your paper and set preferences below. Our scientific production team
            produces a publication-quality video to your specifications. When it&apos;s ready,
            it appears in <strong>My Library</strong> on your account only.
          </p>
          <p style={{ marginTop: 10, fontSize: 14 }}>
            <Link href="/library" style={{ color: "var(--blue)", fontWeight: 700 }}>
              View My Library
            </Link>
          </p>
        </div>
        <CreateRequestForm />
      </Container>
    </section>
  );
}
