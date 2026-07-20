# Sensationalize Science

**Research, Reimagined as Video.**

Upload a research paper PDF and get a narrated, animated motion-graphics
explainer video. The app turns papers into publication-quality short-form
video through an AI-assisted pipeline: script generation, figure extraction and
AI recreation, narration, and programmatic video rendering — with a
review-and-approve workflow, user accounts, credits, and Stripe billing.

> The npm package/repo is named `paper2video`; the product/brand is
> **Sensationalize Science** (configured in `config/site.ts`).

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Pipeline](#pipeline)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Scripts](#scripts)
- [Data & generated files](#data--generated-files)
- [Deployment (production)](#deployment-production)
- [Stripe billing setup](#stripe-billing-setup)
- [Unlimited / owner accounts](#unlimited--owner-accounts)
- [Contributing & GitHub workflow](#contributing--github-workflow)
- [Security notes](#security-notes)

---

## Overview

Sensationalize Science is a single [Next.js](https://nextjs.org) application
(App Router) that contains both the frontend (marketing site, dashboard, review
UI) and the backend (API routes for uploads, script/figure generation,
rendering, auth, and billing). There is **no separate backend service** — API
routes under `app/api/**` are the backend.

Rendering happens **locally/in-process** via [Remotion](https://www.remotion.dev)
(a headless Chromium + ffmpeg), so no external render farm is required.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | CSS (`app/globals.css`), no CSS framework |
| Database | SQLite via `better-sqlite3` (file-based, on a persistent volume in prod) |
| Auth | Session cookies (JWT via `jose`), passwords hashed with `bcryptjs` |
| Script generation | Anthropic Claude (`@anthropic-ai/sdk`) |
| Figure analysis | Anthropic Claude (vision) |
| Scene / figure images | Google Gemini image model |
| Narration (TTS) | ElevenLabs |
| Video rendering | Remotion (`@remotion/renderer`, `@remotion/bundler`), `ffmpeg-static` |
| PDF parsing | `pdf-parse` (text), `pdfjs-dist` + `sharp`/`@napi-rs/canvas` (figures) |
| Payments | Stripe (`stripe`) |
| Deployment | Docker → Railway (persistent volume mounted at `/data`) |

## Pipeline

```
PDF upload
  → extract text                (lib/pdf.ts, pdf-parse)
  → extract + analyze figures    (lib/figures/*, pdfjs-dist + sharp + Claude vision)
  → write scene script           (lib/script.ts, Claude → strict JSON)
  → AI-recreate key figures       (lib/image.ts, Gemini)
  → per-scene narration (TTS)     (lib/tts.ts, ElevenLabs → one mp3 per scene)
  → probe audio duration          (music-metadata)
  → render motion-graphics mp4    (remotion/, @remotion/renderer, headless Chromium)
  → review / approve / download   (served from public/renders/<id>/)
```

The script step and the render step are **separate API routes on purpose** so
the script can be previewed/edited before spending TTS + render time.

## Folder structure

```
paper2video/
├── app/                    # Next.js App Router: pages + API routes (the backend)
│   ├── api/                # Backend endpoints (script, render, auth, billing, projects…)
│   ├── projects/           # Production project pages (intake, review board)
│   └── *                   # Marketing + auth pages (home, pricing, login, signup…)
├── components/             # React UI components
│   └── figures/            # Figure review UI
├── config/                 # Site copy, pricing, FAQ, render options (single source of truth)
├── lib/                    # Server logic
│   ├── figures/            # Figure extraction / analysis / ranking / storage
│   ├── auth.ts             # Sessions, users, credits
│   ├── billing.ts          # Credit logic + unlimited accounts
│   ├── db.ts               # SQLite schema + connection
│   ├── seed-testers.ts     # Auto-create unlimited/owner accounts from env
│   ├── script.ts           # Claude script generation
│   ├── image.ts            # Gemini image generation
│   ├── tts.ts              # ElevenLabs narration
│   ├── render.ts           # Remotion render orchestration
│   └── stripe.ts           # Stripe client
├── remotion/               # Remotion compositions (the actual video templates)
├── scripts/                # railway-start.sh (prod startup / volume symlinks)
├── Dockerfile              # Production image (Chromium deps + standalone build)
├── railway.json            # Railway build/deploy config
├── next.config.js          # Standalone output + native package externals
├── .env.example            # Template for all environment variables
└── data/ , public/renders/ # Runtime data + generated media (gitignored)
```

## Prerequisites

- **Node.js 22.x** (matches the Docker base image; Node 20+ works locally)
- **npm** (repo ships a `package-lock.json`)
- API keys: Anthropic, ElevenLabs, Google Gemini (and Stripe for billing)
- Notes on native modules: `better-sqlite3`, `sharp`, `@napi-rs/canvas`, and
  `ffmpeg-static` are compiled/native. On first render, Remotion downloads a
  headless Chromium binary, so the first video is slower than later ones.

## Installation

```bash
git clone <your-repo-url>
cd paper2video
npm install
cp .env.example .env      # then fill in your keys (see below)
npm run dev               # http://localhost:3000
```

That's the entire setup — a new developer needs only `git clone`,
`npm install`, `cp .env.example .env` (+ their own keys), and `npm run dev`.

## Environment variables

Copy `.env.example` → `.env` and fill in values. **Never commit `.env`** — it is
gitignored. Every variable the code reads is listed below.

### Required

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude — script + figure analysis | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | Narration audio (TTS) | https://elevenlabs.io → Profile → API Keys |
| `ELEVENLABS_VOICE_ID` | Default voice | ElevenLabs voice library |
| `GEMINI_API_KEY` | AI scene/figure images | https://aistudio.google.com/apikey |
| `AUTH_SECRET` | Signs session cookies; ≥16 chars random | generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Public base URL (Stripe redirects) | `http://localhost:3000` locally |

> If `AUTH_SECRET` is missing/short, a dev-only fallback is used so local dev
> still works. **It must be set in production** or sessions are insecure.

### Required for billing (Stripe)

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Dashboard webhook signing secret (`whsec_…`) |
| `STRIPE_PRICE_ID_CREDITS` | One-time credit-pack price |
| `STRIPE_PRICE_ID_CREATOR_MONTHLY` / `_YEARLY` | Creator subscription prices |
| `STRIPE_PRICE_ID_LAB_MONTHLY` / `_YEARLY` | Lab subscription prices |
| `STRIPE_CREDITS_PER_PACK` | Credits granted per one-time pack (default 5) |
| `STRIPE_CREDIT_PACK_LABEL` | Display label for the credit pack |

### Optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `FIGURE_ANALYSIS_MODEL` | `claude-sonnet-4-5-20250929` | Vision model for figures |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` | Image model override |
| `ELEVENLABS_SPEED` | `1.0` | ElevenLabs voice speed |
| `NARRATION_SPEED` | `1.2` | Post-TTS ffmpeg speedup |
| `RENDER_SCALE` | `0.5` | Output resolution scale (1.0 = 1080p) |
| `RENDER_CONCURRENCY` | `1` | Parallel Remotion workers |
| `FFMPEG_THREADS` | `2` | ffmpeg thread count |
| `STRIPE_AUTOMATIC_TAX` | `false` | Enable Stripe automatic tax |
| `UNLIMITED_TEST_ACCOUNTS` | — | `email:password,…` unlimited accounts |
| `UNLIMITED_TEST_EMAILS` / `UNLIMITED_TEST_PASSWORD` | — | Legacy unlimited-account form |

## Local development

- Frontend and backend run together: `npm run dev` starts Next.js on
  `http://localhost:3000`. There is no separate server to start.
- The SQLite database is created automatically at `data/jobs.db` on first run.
- The first video render downloads a Chromium binary (one-time, slower).
- To test Stripe webhooks locally, use the Stripe CLI:
  `stripe listen --forward-to localhost:3000/api/billing/webhook` and put the
  CLI's `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (frontend + API) at `:3000` |
| `npm run build` | Production build (Next.js standalone output) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint via `next lint` |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`), no emit |

> There is no automated test suite yet. Verify changes with
> `npm run lint && npm run typecheck && npm run build`. To smoke-test the
> pipeline, use 2 open-access PDFs (one clean single-column, one messy
> multi-column) since extraction quality is the most variable part.

## Data & generated files

These are **gitignored** and must never be committed:

- `data/` — SQLite database (`jobs.db`) + per-project figure assets.
- `public/renders/` — generated audio and rendered `.mp4` files (can be
  hundreds of MB; there is no auto-cleanup, prune periodically).

In production these live on a Railway **persistent volume mounted at `/data`**;
`scripts/railway-start.sh` symlinks `./data` and `./public/renders` onto it so
data and videos survive redeploys.

## Deployment (production)

Production runs as a **Docker container on [Railway](https://railway.app)**.

1. **Build**: Railway builds the `Dockerfile` (config in `railway.json`). The
   image installs Chromium/Remotion system libs, runs `npm ci` + `npm run
   build`, and installs the Remotion headless browser.
2. **Volume**: attach a Railway volume mounted at **`/data`** (persists SQLite +
   rendered videos). Startup (`scripts/railway-start.sh`) creates and symlinks
   `/data/db` → `./data` and `/data/renders` → `./public/renders`.
3. **Environment variables**: set every variable from
   [Environment variables](#environment-variables) in the Railway service's
   **Variables** tab — including `NEXT_PUBLIC_APP_URL` set to the generated
   Railway domain (e.g. `https://your-app.up.railway.app`), and production
   Stripe keys/price IDs.
4. **Domain**: generate a domain in Railway, then update `NEXT_PUBLIC_APP_URL`
   and the Stripe webhook endpoint to that URL.
5. **Deploy**: push to the connected branch (or `railway up`). The container
   starts via `CMD ["bash", "scripts/railway-start.sh"]`.

### Where deployment credentials live (never in the repo)

- **All secrets** (API keys, `AUTH_SECRET`, Stripe keys/webhook secret) → the
  Railway service **Variables** tab, not the repo.
- **Railway account access** → the Railway dashboard / `railway login` token on
  the deployer's machine.
- **Stripe webhook secret** → generated in the Stripe Dashboard when you add the
  production webhook endpoint, then pasted into Railway.

## Stripe billing setup

1. In the Stripe Dashboard, create products/prices for **Creator** and **Lab**
   (monthly + yearly) and a one-time **credit pack**, matching
   `config/pricing.ts`.
2. Put each resulting `price_…` ID into the matching `STRIPE_PRICE_ID_*` env var.
3. Add a webhook endpoint pointing at `<NEXT_PUBLIC_APP_URL>/api/billing/webhook`
   and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Use **test** keys/prices for staging and **live** keys/prices for production —
   keep them in separate environments, never mixed in the same `.env`.

## Unlimited / owner accounts

Accounts listed in `UNLIMITED_TEST_ACCOUNTS` (or the legacy
`UNLIMITED_TEST_EMAILS` + `UNLIMITED_TEST_PASSWORD`) get unlimited video
generation and are auto-created / password-synced on startup
(`lib/seed-testers.ts`). Passwords must be ≥8 characters. There is **no**
hardcoded default password — if none is provided, the account is skipped.

## Contributing & GitHub workflow

This repo is set up for a standard feature-branch + Pull Request flow:

1. **Branch** off `main`: `git checkout -b feature/<short-description>`.
2. **Commit** small, focused changes with clear messages.
3. Before pushing, run `npm run lint && npm run typecheck && npm run build`.
4. **Push** and open a **Pull Request** into `main`.
5. Get at least one review, ensure checks pass, then squash-merge.

### Recommended GitHub repo settings

Configure these under **Settings → Branches → Branch protection rules** for
`main`:

- **Require a pull request before merging** (no direct pushes to `main`).
- **Require at least 1 approving review**.
- **Require status checks to pass** (add a CI workflow running lint + typecheck +
  build, then mark it required).
- **Require branches to be up to date** before merging.
- **Require conversation resolution** before merging.
- Optionally enable **secret scanning** and **push protection** (Settings →
  Code security) so keys can never be pushed by accident.

> A collaborator only needs to be invited under **Settings → Collaborators** and
> to configure their own `.env` — no access to anyone's Cursor/editor account is
> required.

## Security notes

- No secrets are committed: `.env`, `data/`, and `public/renders/` are all
  gitignored, and `.env.example` contains only placeholders.
- All API keys are read from environment variables — none are hardcoded in
  source.
- Rotate any key that has ever been shared in chat, screenshots, or logs, and
  keep test vs. live Stripe keys in separate environments.
- `AUTH_SECRET` must be a long random value in production.
