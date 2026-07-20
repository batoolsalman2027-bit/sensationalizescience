/**
 * Central access point for every environment variable the app uses.
 *
 * IMPORTANT: this file contains NO secret values — only the *names* of the
 * variables. The real values live in `.env` (local) and Railway → Variables
 * (production), both of which are never committed. Import from here instead of
 * scattering `process.env.X` across the codebase, so there's one place to see
 * everything the app needs.
 *
 *   import { env } from "@/lib/env";
 *   const key = env.ANTHROPIC_API_KEY;
 */

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  // ---- AI services (secret) ----
  ANTHROPIC_API_KEY: optional("ANTHROPIC_API_KEY"),
  ELEVENLABS_API_KEY: optional("ELEVENLABS_API_KEY"),
  ELEVENLABS_VOICE_ID: optional("ELEVENLABS_VOICE_ID"),
  GEMINI_API_KEY: optional("GEMINI_API_KEY"),

  // ---- Auth (secret) ----
  AUTH_SECRET: optional("AUTH_SECRET"),

  // ---- App URL ----
  NEXT_PUBLIC_APP_URL: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // ---- Stripe (secret) ----
  STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID_CREDITS: optional("STRIPE_PRICE_ID_CREDITS"),
  STRIPE_PRICE_ID_CREATOR_MONTHLY: optional("STRIPE_PRICE_ID_CREATOR_MONTHLY"),
  STRIPE_PRICE_ID_CREATOR_YEARLY: optional("STRIPE_PRICE_ID_CREATOR_YEARLY"),
  STRIPE_PRICE_ID_LAB_MONTHLY: optional("STRIPE_PRICE_ID_LAB_MONTHLY"),
  STRIPE_PRICE_ID_LAB_YEARLY: optional("STRIPE_PRICE_ID_LAB_YEARLY"),

  // ---- Optional tuning / models ----
  FIGURE_ANALYSIS_MODEL: optional("FIGURE_ANALYSIS_MODEL"),
  GEMINI_IMAGE_MODEL: optional("GEMINI_IMAGE_MODEL"),
  ELEVENLABS_SPEED: optional("ELEVENLABS_SPEED"),
  NARRATION_SPEED: optional("NARRATION_SPEED"),
  RENDER_SCALE: optional("RENDER_SCALE"),
  RENDER_CONCURRENCY: optional("RENDER_CONCURRENCY"),
  FFMPEG_THREADS: optional("FFMPEG_THREADS"),
  STRIPE_AUTOMATIC_TAX: optional("STRIPE_AUTOMATIC_TAX"),
  STRIPE_CREDITS_PER_PACK: optional("STRIPE_CREDITS_PER_PACK"),
  STRIPE_CREDIT_PACK_LABEL: optional("STRIPE_CREDIT_PACK_LABEL"),

  // ---- Owner / unlimited accounts ----
  UNLIMITED_TEST_ACCOUNTS: optional("UNLIMITED_TEST_ACCOUNTS"),
  UNLIMITED_TEST_EMAILS: optional("UNLIMITED_TEST_EMAILS"),
  UNLIMITED_TEST_PASSWORD: optional("UNLIMITED_TEST_PASSWORD"),
} as const;

/** Env vars that must be present for core features to work. */
const REQUIRED_KEYS = [
  "ANTHROPIC_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "GEMINI_API_KEY",
] as const;

/**
 * Log a warning for any missing required key. Call once at startup if you want
 * an early heads-up; it never throws, so it won't break local exploration.
 */
export function warnOnMissingEnv(): void {
  const missing = REQUIRED_KEYS.filter((k) => !env[k]);
  if (missing.length > 0) {
    console.warn(
      `[env] missing required variables: ${missing.join(", ")} — ` +
        `copy .env.example to .env and fill them in.`
    );
  }
}
