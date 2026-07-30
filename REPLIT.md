# Running "Sensationalize Science" on Replit (for collaboration)

This repo is a **full-stack Next.js 14 app** (package name `paper2video`), not a
pure frontend. It has heavy native/server dependencies. This guide gets it onto
Replit so you can invite collaborators and edit together in real time
(multiplayer).

> These files are **additive**. Local `npm run dev` on your Mac is unchanged.

---

## TL;DR recommendation

**Import the whole repo from GitHub into Replit (Option A).** It's the simplest
setup for collaboration and the UI/marketing pages, auth, billing, and API
routes all run in Replit's dev server. The one thing that may *not* work
reliably on Replit is **server-side video rendering** (Remotion + headless
Chromium + ffmpeg) — that's the only feature at risk, and it doesn't block
collaborative UI/frontend work. If video export misbehaves on Replit, just do
those renders locally.

---

## Native-dependency risk table

| Dependency | Used for | Replit (Nix) status |
| --- | --- | --- |
| `better-sqlite3` | app database | Compiles via node-gyp; toolchain provided in `replit.nix`. Should work. |
| `sharp` | image processing | Prebuilt libvips binaries; `pkgs.vips` provided. Should work. |
| `@napi-rs/canvas` | figure/canvas rendering | Prebuilt skia `.node`; cairo/pango stack provided. Usually works. |
| `ffmpeg-static` | audio/video muxing | Static binary may not run on NixOS; `pkgs.ffmpeg` provided as fallback. Medium risk. |
| `@remotion/renderer` + `@remotion/bundler` | video export | Needs headless Chromium; `pkgs.chromium` provided via `REMOTION_CHROME_EXECUTABLE`. **Highest risk** — may need tuning or be done locally. |
| `pdf-parse` / `pdfjs-dist` | PDF ingestion | Pure JS. Fine. |
| `stripe`, `jose`, `bcryptjs` | billing/auth | Pure JS. Fine. |

**Bottom line:** everything except reliable in-Replit *video rendering* should
run. Collaboration and frontend/UI work are fully supported.

---

## Option A — Import the whole repo (recommended)

Your repo already has a GitHub remote:
`https://github.com/batoolsalman2027-bit/synapse.git`

### 1. Push your latest work to GitHub (from your Mac)

```bash
# from the project root
git status                 # review what will be committed
git add -A
git commit -m "Add Replit config for collaboration"
git push origin main
```

> Your `.env` is gitignored and will **not** be pushed — that's correct. Never
> commit real secrets.

### 2. Create the Repl from GitHub

1. Go to https://replit.com and log in (create a free account if needed).
2. Click **Create Repl** → **Import from GitHub**.
3. Paste: `https://github.com/batoolsalman2027-bit/synapse`
4. If the repo is private, connect/authorize your GitHub account when prompted.
5. Replit reads the committed `.replit` and `replit.nix` automatically.

### 3. Install dependencies (first boot)

Open the **Shell** tab in Replit and run:

```bash
npm install
```

This compiles the native modules against the Nix libs. Give it a few minutes the
first time.

### 4. Add secrets (do NOT commit `.env`)

In Replit, open **Tools → Secrets** (padlock icon) and add each key from the
list in the next section. Replit injects these as environment variables at
runtime — the equivalent of your local `.env`.

Set at minimum:
- `NEXT_PUBLIC_APP_URL` → your Repl's public URL, e.g.
  `https://<repl-name>.<username>.repl.co` (grab it after first run).
- `AUTH_SECRET` → a long random string.

### 5. Run

Click **Run** (uses `npm run dev -- -H 0.0.0.0 -p 3000` from `.replit`). The
webview opens the app. If it doesn't appear, open the Shell and run
`npm run dev -- -H 0.0.0.0 -p 3000` manually and click the forwarded port.

### 6. Invite collaborators

- Click **Invite** (top-right of the workspace).
- Add collaborator emails/usernames, or copy the **Join link**.
- They can edit files and see the same live preview in real time (multiplayer).

---

## Option B — Frontend-only Repl (lightweight UI collaboration)

Only choose this if collaborators just need to work on the **marketing/UI pages**
(`app/page.tsx`, `app/pricing`, `app/about`, `app/platform`, `app/faq`, the
`app/scroll-demo` hero, etc.) and you want to avoid native builds entirely.

What you'd strip (in a **separate branch/repo**, not here):
- Delete `app/api/**` route handlers (auth, billing, projects, video, script).
- Remove server-only deps from `package.json`: `better-sqlite3`,
  `@remotion/*`, `remotion`, `@napi-rs/canvas`, `sharp`, `ffmpeg-static`,
  `pdf-parse`, `pdfjs-dist`, `stripe`, `@anthropic-ai/sdk`.
- Stub any component/server code that imports the above (e.g. DB access, render
  jobs) so pages render with mock data.
- Drop `output: "standalone"` and the `serverComponentsExternalPackages` list
  from `next.config.js` (no longer needed).

**Tradeoffs:** far faster/lighter Repl and no native-build risk, but it's a
maintenance fork — UI changes made in Replit must be manually merged back, and
anything touching the API/data layer can't be tested there. For true
collaboration on the real app, **Option A is better.**

---

## Environment variables to set as Replit Secrets

Add these under **Tools → Secrets** (key names only — copy your real values from
your local `.env`, never commit them):

**Required**
- `ANTHROPIC_API_KEY`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`  (set to your Repl's public URL)

**Media generation (needed for full pipeline)**
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `GEMINI_API_KEY`

**Billing (Stripe)**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_CREDITS`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CREDITS_PER_PACK`
- `STRIPE_CREDIT_PACK_LABEL`
- `STRIPE_PRICE_ID_CREATOR_MONTHLY`
- `STRIPE_PRICE_ID_CREATOR_YEARLY`
- `STRIPE_PRICE_ID_LAB_MONTHLY`
- `STRIPE_PRICE_ID_LAB_YEARLY`

**Optional (have defaults — only set to override)**
- `FIGURE_ANALYSIS_MODEL`
- `ELEVENLABS_SPEED`
- `NARRATION_SPEED`
- `GEMINI_IMAGE_MODEL`
- `RENDER_SCALE`
- `RENDER_CONCURRENCY`
- `FFMPEG_THREADS`
- `STRIPE_AUTOMATIC_TAX`
- `UNLIMITED_TEST_ACCOUNTS`  (or legacy `UNLIMITED_TEST_EMAILS` + `UNLIMITED_TEST_PASSWORD`)

---

## Troubleshooting

- **App loads but is blank / "connection refused":** ensure the run command
  includes `-H 0.0.0.0`; Replit can't reach a server bound to `localhost`.
- **`better-sqlite3` build fails:** re-run `npm install` in the Shell; the Nix
  toolchain (`python3`, `pkg-config`, `gnumake`, `gcc`) is declared in
  `replit.nix`.
- **`sharp`/`canvas` "cannot open shared object file":** the `LD_LIBRARY_PATH`
  in `replit.nix` covers this; restart the Repl so Nix reloads env vars.
- **Video render fails:** expected on Replit. Do renders locally; the rest of
  the app is unaffected.
