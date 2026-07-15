import type { Metadata } from "next";
import { Suspense } from "react";
import Container from "@/components/Container";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in — Sensationalize Medicine" };

export default function LoginPage() {
  return (
    <section className="section" style={{ paddingTop: 64 }}>
      <Container style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 className="section-title" style={{ fontSize: 30, textAlign: "center", marginBottom: 8 }}>
            Log in
          </h1>
          <p style={{ color: "var(--ink-soft)", textAlign: "center", fontSize: 14, margin: "0 0 22px" }}>
            Access your credits and keep generating research videos.
          </p>
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
