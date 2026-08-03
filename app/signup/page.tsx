import type { Metadata } from "next";
import { Suspense } from "react";
import Container from "@/components/Container";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign up · Sensationalize Science" };

export default function SignupPage() {
  return (
    <section className="section" style={{ paddingTop: 64 }}>
      <Container style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 className="section-title" style={{ fontSize: 30, textAlign: "center", marginBottom: 8 }}>
            Create your account
          </h1>
          <p style={{ color: "var(--ink-soft)", textAlign: "center", fontSize: 14, margin: "0 0 22px" }}>
            Your first video is free. Buy credits when you&apos;re ready — one credit
            equals one finished video, and credits never expire.
          </p>
          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
