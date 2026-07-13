# Paper2Video

Upload a research paper PDF → get a narrated, animated motion-graphics
explainer video.

## Pipeline

```
PDF upload
  → extract text              (lib/pdf.ts, pdf-parse)
  → trim to summary-worthy    (lib/pdf.ts, drops references/ack, caps length)
  → write scene script        (lib/script.ts, Claude → strict JSON incl. per-scene icon)
  → per-scene ElevenLabs TTS  (lib/render.ts, one mp3 per scene + hook)
  → probe audio duration      (lib/render.ts, music-metadata)
  → render motion-graphics mp4 (remotion/, @remotion/renderer, local headless Chromium)
  → play / download           (public/renders/<jobId>/video.mp4, served statically)
```

The script step and the video step are **separate API routes on purpose** so
you can preview and edit the script before spending ElevenLabs TTS calls.

## Setup

```bash
npm install
cp .env.example .env      # then fill in your keys
npm run dev               # http://localhost:3000
```

### Required keys
- `ANTHROPIC_API_KEY` — script generation.
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` — narration audio. This is
  the only audio source (no avatar provider doing TTS for you), so it's
  required, not optional.

### About rendering
Rendering happens locally via [Remotion](https://www.remotion.dev) — no
avatar-provider render credits or queues. The **first render** will be
noticeably slower than later ones: `@remotion/renderer` downloads a headless
Chromium binary the first time it runs. After that, rendering is CPU-bound
and local (typically tens of seconds to a couple of minutes for a ~60-90s
video, depending on your machine).

## What's stubbed / known limitations

- **Job store is in-memory** (`lib/jobs.ts`) — resets on restart, single-instance
  only. Swap for Redis/DB before deploying.
- **Scanned/image PDFs** return no text — needs OCR (Tesseract), out of scope.
- **No auth, no rate limiting, no storage** of past videos.
- **Rendered files accumulate** under `public/renders/<jobId>/` (audio +
  mp4) with no auto-cleanup — fine for local dev, needs a cleanup job before
  deploying anywhere real.
- **macOS Gatekeeper**: on first render, macOS may quarantine the
  freshly-downloaded native Remotion compositor binary. If a render fails
  with a spawn/permission error, running the render once more from a plain
  terminal usually clears it.

## Good next steps to hand to Claude Code

1. **Make the script editable** in the UI before rendering (textarea per
   scene, recompute `fullNarration` on submit).
2. **Add a DOI intake path**: resolve DOI → fetch open-access PDF
   (Unpaywall) → feed the same `/api/script` route. PDF path already works,
   so this is additive.
3. **Persist jobs** in Redis/Postgres so renders survive restarts.
4. **Handle scanned PDFs** with an OCR fallback.
5. **Cache the Remotion bundle** across renders instead of re-bundling per
   job, to speed up repeated renders.
6. **Add more icon variety / custom icon packs** beyond the current fixed
   ~20-icon vocabulary in `remotion/icons.ts`.

## Test fixtures
Grab 2 open-access PDFs to test with — one clean single-column, one messy
multi-column — since extraction quality is the most variable part.
