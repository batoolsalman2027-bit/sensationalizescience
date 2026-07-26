# Sensationalize Science — Project Status & Handoff

_Last updated: 2026-07-26._ This is a working handoff for a new session. It records
the repositioning effort, what's built, known issues, and what's next.

## What this project is

A Next.js 14 (App Router) app that turns scientific papers into short narrated
videos. Stack: hand-written CSS design system in `app/globals.css` (no Tailwind),
SQLite via `better-sqlite3` (`data/jobs.db`), Remotion for video rendering, Claude
for script generation, Google Gemini for scene images, ElevenLabs for narration,
Stripe for billing.

- **Working directory:** `/Users/batoolsalman/Downloads/Sensationalize Science`
  (renamed mid-project from `paper2video`; `package.json` name is still
  `"paper2video"`).
- **Git remote:** `batoolsalman2027-bit/synapse`, branch `main`.
- **Product brands seen in history:** Synapse → Sensationalize Medicine →
  Sensationalize Science (current).

## Strategic goal (the repositioning)

Move from a self-serve "instant AI video in minutes" tool for individual
scientists → a **premium scientific video-production platform** sold to labs, PIs,
departments, institutes, journals, and biotech/pharma. Positioning shifts toward:
human-in-the-loop QC, scientific accuracy, ~3–5 business-day turnaround, lab
review/approval, original scientific visualization. Away from: instant/one-click,
"in minutes", unsupervised AI publishing.

Work is being done in **sequential phases**, stopping for approval between each.

## Dev environment gotchas (read before running anything)

- Node is via nvm (node 24). **Prefix npm/npx commands with `source ~/.nvm/nvm.sh`.**
- `timeout`/`gtimeout` is **not installed** — don't use it. For long commands use
  background execution and poll the output file.
- Scripts: `dev`, `build`, `start`, `lint`. **`npm run lint` is NOT configured** —
  it drops into Next's interactive ESLint setup prompt. Use `npx tsc --noEmit`
  for typechecking. **There is no test runner.**
- Typecheck (`tsc --noEmit`) and `npm run build` both pass as of this writing.
- All four API keys are set in `.env`: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`,
  `ELEVENLABS_VOICE_ID`, `GEMINI_API_KEY`. `.env` and `data/` are gitignored;
  `public/renders/` is gitignored too.

## Git state (verify at session start — it has been surprising)

- `git status` currently shows **only** `M lib/audio.ts` and `M lib/render.ts`
  modified. Those are the Auxetica render bug-fixes (see below) and are the only
  uncommitted code.
- **All Phase 1 / 2a / 2b work is already committed in HEAD** (`d5aba49`). The
  phase files show up under `git ls-tree HEAD` even though HEAD's message is a
  generic "chore" — history appears to have been squashed/rewritten between work
  sessions. Confirm with `git ls-tree HEAD lib/figures` and
  `git show HEAD:app/page.tsx | grep ProductionWorkflow`.
- Branch `main` is **ahead of `origin/main` by 1 commit** (not pushed). No PR has
  been opened (the user declined one earlier).
- **Action for next session:** decide whether to commit the two audio/render
  fixes and whether to push/PR. Because history may diverge from origin, check
  before force-anything.

---

## Phase 1 — Homepage workflow figure  ✅ DONE (committed)

Added a 6-stage "production process" diagram to the homepage and revised copy to
match premium positioning (removed "in minutes" claims).

- `config/site.ts` — added `TURNAROUND` (single source of truth for the "3–5
  business days" promise) and `PRODUCTION_WORKFLOW` (6 stages, `WorkflowStage`
  interface). Removed `HOW_IT_WORKS`. Revised `HERO`, `WHY_IT_MATTERS`,
  `ABOUT.vision`, `FINAL_CTA`.
- `components/ProductionWorkflow.tsx` — new serpentine timeline (3×2 desktop →
  2-col tablet → 1-col vertical-rail mobile). Scroll-reveal is additive only:
  renders fully visible with JS off / reduced motion.
- `app/page.tsx` — replaced the old 4-step grid + `HeroWorkflow` demo with the new
  section; minor copy edits in the accuracy section.
- `app/globals.css` — `.wf-*` styles.
- **`components/HeroWorkflow.tsx` is now unused** (left in place, dead code).
- Verified across breakpoints; fixed a step-label contrast issue (→ `--ink-soft`).

## Phase 2a — Figure extraction/analysis backend + persistence  ✅ DONE (committed)

A pipeline that extracts figures from a paper, classifies them, attempts to
recover their data, ranks them for a short video, and persists everything with
provenance + an append-only audit trail.

New `lib/figures/`:
- `types.ts` — all typed structures. Key idea: a visual may only be presented as
  the paper's real data when the numbers are genuinely recovered. See estimation
  note below.
- `pdf-layout.ts` — `PdfSession` (opens the PDF once), positioned text extraction,
  and **page-region rasterization via `@napi-rs/canvas`** — this is what lets us
  see **vector** charts the old raster-only extractor (`lib/pdf-figures.ts`)
  couldn't. Installs `DOMMatrix`/`Path2D`/`ImageData` globals for pdfjs.
- `extract.ts` — caption-anchored figure detection. Column-aware (fixes
  two-column caption interleaving), ligature normalization ("identi fi cation"),
  binds caption + section + in-text reference context by position, crops to
  `data/projects/<id>/figures/<fig>.png`.
- `analyze.ts` — one vision call per figure: classification (`kind`, summary,
  result direction, labels, units, panels, text-dependence) + gated data
  recovery. `parseFirstJsonObject()` robustly extracts JSON from model output.
- `rank.ts` — 5-axis scoring (importance, relevance, short-form fit, clarity,
  animatability) → weighted composite; `routeRecreation()` maps each figure to a
  recreation method (see below) or excludes it.
- `pipeline.ts` — orchestrates extract → analyze (concurrency 3) → rank → persist;
  keeps failed figures visible with an exclusion reason; writes audit events.
- `store.ts` — projects, figures, provenance, review events (typed JSON in
  columns for whole-object fields; real columns for anything queried).
- `paths.ts` — dependency-free asset-path helper (so light routes don't pull in
  the canvas/pdf stack).

`lib/db.ts` — extracted the schema into a single `SCHEMA` const (it was duplicated
between the on-disk and in-memory DBs and could drift). Added tables: `projects`,
`figures`, `visual_provenance`, `review_events`.

API routes under `app/api/projects/`:
- `route.ts` — `POST` (create project, run pipeline synchronously, return ranked
  figures) and `GET` (list).
- `[id]/route.ts` — project + figures + provenance + events.
- `[id]/figures/[figureId]/route.ts` — `PATCH` a reviewer decision (audited).
- `[id]/assets/[file]/route.ts` — serve a figure crop from `data/` with ownership
  check + path-traversal guard (crops are unpublished research, not static).

Other: `next.config.js` adds `@napi-rs/canvas` to
`serverComponentsExternalPackages` (native `.node` binary can't be webpacked).
`.env.example` documents optional `FIGURE_ANALYSIS_MODEL`
(default `claude-sonnet-4-5-20250929`). New dependency: `@napi-rs/canvas`.

Verified end-to-end against a real Nature Comms paper: 4/4 figures extracted
(including a fully vector chart), sensible ranking, HTTP routes work, traversal
blocked, decisions persist and audit.

### Estimation policy (user decision — important)

Originally charts were only built from values **quoted** in the paper; if numbers
weren't quoted, the chart was **excluded**. On the test paper this excluded every
chart (papers usually plot values they never write out). **The user then chose to
allow vision-estimated charts.** So:
- `DataProvenanceSource` gained `vision_estimated`; `FigureData` gained
  `estimated: boolean` + `estimateConfidence`; `RecreationMethod` gained
  `estimated_chart` (kept separate from `data_reconstruction`); `isDataFaithful()`
  returns false for estimates.
- Rationale the user gave: **their team does QC on every video before delivery**,
  so estimates are caught by humans. Estimates currently **auto-recommend** but
  are flagged everywhere.
- **Known risk, observed:** on the test paper an estimate **inverted a result**
  (reported ~0.75 where the plot showed ~0.32) with 85% self-reported confidence,
  and mixed values between panels. The QC UI is explicitly designed to surface
  this. If accuracy becomes paramount, reconsider auto-recommending estimates.

## Phase 2b — QC review UI  ✅ DONE (committed)

Internal quality-control surface for the production team.

- `components/figures/FigureReviewBoard.tsx` — original figure crop **side by
  side** with the derived data (classification, method, 5-axis scores, recovered
  series as a table, rationale). Estimated charts get a project-level banner + amber
  card/panel + confidence %. Approve / reject / mark-for-replacement, optimistic
  updates, persisted + audited.
- `components/figures/ProjectIntake.tsx` — upload with staged progress / error /
  retry; optional narrative field.
- `app/projects/page.tsx` (list), `app/projects/new/page.tsx` (intake),
  `app/projects/[id]/page.tsx` (review dashboard + audit trail).
- `app/globals.css` — `.qc-*` and `.intake-*` styles; source image is sticky on
  desktop for comparison.
- Verified in browser: decisions persist server-side + audit trail; mobile has no
  horizontal scroll; no console errors.

**Caveats for these pages:**
- Not linked from the nav — reachable only by URL.
- **No operator/customer role separation** — access is gated only by project
  ownership. Needs a real operator role before genuine internal use.
- **Intake is synchronous** — analysis runs inside the POST (~30–60s for a
  4-figure paper). Will time out on figure-heavy papers; belongs behind a job
  queue (natural Phase 3/4 work).

## Phase 3 — Vendor-neutral video pipeline  ⛔ NOT STARTED (as designed)

Phase 3 as originally scoped (a provider-abstraction layer so scenes can route to
different video-generation vendors, with a scene data model, cost tracking,
fallback, QC workflow, phased plan) **was never architected or built.** The
current visual pipeline is still Gemini images + Remotion, hardcoded in
`lib/render.ts`. When resuming Phase 3, start with the architecture proposal the
user asked for before touching the pipeline, and **keep the existing generator as
a fallback** (an explicit requirement).

---

## Detour: the "Auxetica" demo video  ✅ DONE (fixes uncommitted)

Instead of Phase 3's architecture, the user asked to render a specific
hand-written script — the "Auxetica" spinal-implant story (Patrick & Katie,
VentureWell) — through the **existing** Remotion pipeline.

- **Runner (outside the repo):**
  `<session scratchpad>/auxetica.mts` — hand-authored `VideoScript` (title card +
  primer + 4 beats), calls `renderVideo(script, "auxetica-demo", {aspectRatio:
  "9:16"})`. If recreating: build a `VideoScript` matching `lib/types.ts` and call
  `renderVideo`. Load `.env` into `process.env` first; `createJob` is guarded with
  `getJob` for idempotency.
- **Output:** `public/renders/auxetica-demo/video.mp4` — 55.5s, 540×960 (9:16),
  H.264 + AAC, ~9.8 MB. Verified frames: cold-open card, spine scene with
  on-screen key-term labels, auxetic-implant scene. On-brand (deep navy + teal),
  faithful to the script. Served at `/api/renders/auxetica-demo` (needs dev
  server; the in-app browser won't navigate to a raw mp4 stream — wrap in an HTML
  `<video>` page or open the file directly). **No copy to ~/Downloads was made**
  (interrupted).
- **Content caveat:** this is a *promotional* piece built on an invented patient
  anecdote — the recovery claims are dramatized, not sourced. Fine as a demo reel;
  not a clinical claim. Title card carries no citation.

### Two real pipeline bugs fixed (UNCOMMITTED — in `lib/audio.ts`, `lib/render.ts`)

1. **MP3 duration probing was broken.** `lib/render.ts` used
   `parseBuffer(buffer, "audio/mpeg")` from `music-metadata`, but v11 removed the
   positional mime-type string arg. Even the corrected `{ mimeType }` form threw
   `"Guessed MIME-type not supported"` **inside the render process** (a
   loader-registry quirk once Remotion/ffmpeg are loaded), despite valid buffers —
   confirmed via instrumentation (buffer was a valid ID3 mp3, byteOffset 0).
   **Fix:** dropped `music-metadata` from the render path; added
   `probeAudioDurationSeconds(filePath)` to `lib/audio.ts` that shells out to the
   already-present `ffmpeg-static` binary (`ffmpeg -i <file> -f null -`, parse
   `Duration:` from stderr). `mp3DurationInFrames` now takes a file path.
2. Runner-only: idempotent job creation (guarded `createJob`).

These fixes are **not yet committed**. They make any render work locally, so
they're worth keeping — commit them unless there's a reason not to.

---

## Suggested next steps

1. **Resolve git:** verify HEAD vs origin, decide whether to commit the two
   audio/render fixes, and whether to push/open a PR.
2. **Phase 3** (if continuing the roadmap): write the vendor-neutral architecture
   proposal first; get approval before building; keep Gemini+Remotion as fallback.
   Consider moving rendering + figure intake behind a real job queue here.
3. **Wire the QC pages into nav** and add an operator/customer role if the review
   surface is going to be used for real.
4. Revisit whether estimated charts should auto-recommend.
