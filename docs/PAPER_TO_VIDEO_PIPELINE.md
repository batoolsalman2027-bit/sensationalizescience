# Paper → Gallery Video — repeatable pipeline

How we turn a paper PDF into a narrated 16:9 gallery example (see the
`Cancer Genomics` and `Neuroscience` entries in `config/site.ts`).

**Read `docs/VIDEO_PROMPT_SPEC.md` first** — it is the source of truth for how
paper content becomes shots. This file is the operational runbook on top of it.

---

## The prompt to paste in Cursor (with the PDF attached)

Copy everything in the block below, attach the paper PDF, and send it.

```
You are producing a gallery example video for Sensationalize Science from the attached paper PDF.

FIRST, read docs/VIDEO_PROMPT_SPEC.md and docs/PAPER_TO_VIDEO_PIPELINE.md in full and follow them.

Work in this order and DO NOT generate anything that costs money until I approve:

1. Read the ENTIRE paper (use the PDF page ranges; it may be long). Identify: title, authors,
   journal, year, DOI, whether it is a preprint (bioRxiv/medRxiv/arXiv → must be labelled
   "Preprint — not peer reviewed"), and the paper's true evidentiary level (cell line? animal?
   human? correlational?). Keep all claims at that level — never overclaim.

2. Produce a PLAN for my review, nothing generated yet:
   - The exact NARRATION for each scene (what the voiceover says).
   - What is in each scene.
   - For each AI-video scene, the exact Kling prompt + an "Avoid:" list.
   - Which 2–4 figures you'll use, TAKEN STRAIGHT FROM THE PDF (never recreated).

3. Check my credit balances for the AIs we draw from (ElevenLabs, Kling, Runway, Gemini/Veo,
   Anthropic) and tell me if any need a top-up. State the estimated spend.

4. STOP and wait for my approval. Only after I say go, run the pipeline end-to-end and then
   show me the finished MP4.

HARD CONVENTIONS (do not deviate):
- Figures come STRAIGHT FROM THE PDF (crop the real panel), shown STATIC (no Ken Burns / no
  push-in). Remotion/overlays only add a citation chip + section labels + the occasional
  on-screen line — never redraw or recreate a figure or chart.
- Structure ≈ title card (2s, white citation) → INTRODUCTION (human hook → gap → question) →
  METHODS → RESULTS (figures carry the evidence) → SIGNIFICANCE (reverse the zoom, honest).
  ~9 AI-video shots for the human/cinematic beats; the data lives in the cropped figures.
- Every AI-video shot has a VERB (something changes on screen); ONE camera move; ≤2 entities;
  NO on-screen text/labels/numbers in generated video; nothing below cell scale goes to a video
  model (molecular = diagram/none, per the spec).
- No molecular "glowing blob" video. No fake charts/axes from a video model.
- Pronunciation: respell tricky terms phonetically for ElevenLabs, e.g. kinase→"kye-nays",
  kinome→"kye-nohm", genome→"jee-nohm". Confirm with me on playback.
- Match the visual style bible in poc/lib/style_bible.mjs (photoreal Nature-Video look, cool
  clinical palette + restrained warm amber, 16:9).

Reuse the existing scripts as templates (copy per paper, don't overwrite a shipped one):
poc/scripts/gen_praxis.mjs (Kling driver), poc/scripts/composite_praxis.py (ffmpeg composite),
and the example plans poc/examples/*/shots.json. Publish by adding a new category (or video) to
GALLERY_CATEGORIES in config/site.ts and dropping the mp4 + poster in public/gallery/.
```

---

## What the run actually does (operator reference)

Work in an isolated dir per paper: `poc/out/<slug>/` with `clips/ audio/ figures/
overlays/ pages/`. Never reuse another paper's `poc/out/<slug>` (filename collisions on
`sNN__kling.mp4` will silently skip and reuse the wrong clip).

1. **Ingest**: `pdftoppm -png -r 300 -f <p> -l <p> paper.pdf poc/out/<slug>/pages/p`
   for the figure pages.
2. **shots.json** (`poc/out/<slug>/shots.json`): one source of truth. `kind` ∈
   `title|video|figure`. Video beats carry verbatim `klingPrompt` + `avoid` + `seconds`
   (use 8 → Kling makes 10s clips, leaving room to trim to narration). Figure beats carry
   `figureLabel` + `sourcePage`. `sectionLabel` on the first beat of each section; `onscreen`
   for a one-line overlay; `continuityRef` to rhyme significance back to the intro.
3. **Generate (PAID)**: copy `gen_praxis.mjs`, point `BASE` at `poc/out/<slug>`, run
   `node --env-file=.env poc/scripts/gen_<slug>.mjs`. Skips existing files (safe to re-run to
   fill a gap). Kling snaps text-only clips to 5s or 10s.
4. **Narrate**: ElevenLabs, one mp3 per beat with narration → `poc/out/<slug>/audio/<id>.mp3`
   (model `eleven_multilingual_v2`, speed 1.08).
5. **Figures**: crop the real panels from the page PNGs (auto-bbox of the dark region works for
   brain/black-background figures; fractional boxes for white-background figures). Save
   `poc/out/<slug>/figures/<id>.png`.
6. **Title card + overlays** (PIL): white citation card; PNG overlays for section labels,
   `Figure N` chips, and the on-screen question. **This host's ffmpeg has NO `drawtext`
   (no libfreetype), so all text is pre-rendered PNGs composited with the `overlay` filter.**
7. **Composite**: copy `composite_praxis.py`, point `BASE` at `poc/out/<slug>`, run
   `python3 poc/scripts/composite_<slug>.py`. Video beats mux narration (hold last frame if the
   clip is shorter than the VO); figures are STATIC holds with a citation chip; concat →
   `poc/out/<slug>/final.mp4`, 1920×1080, white letterbox, h264/aac.
8. **Publish**: `cp` the mp4 + a poster frame to `public/gallery/`, add a `GalleryVideo` (new
   category if needed) to `GALLERY_CATEGORIES` in `config/site.ts`.

### Gotchas
- **Money gate**: always plan + credit-check + get approval before a paid run. State the cost.
- **Kling balance can run out mid-run** (error code 1102). Re-run the driver after a top-up; it
  fills only the missing clips. Runway's small prepaid credit is usually **not** enough for even
  one gen4.5 clip — don't rely on it as a fallback.
- **`poc/out/` is gitignored.** Preserve each paper's plan at `poc/examples/<slug>/shots.json`.
- **In-press manuscripts** may carry an "ARTICLE IN PRESS" watermark on their figures — inherent
  to the source; swap for the typeset figures when the final version publishes.
- Env keys used: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`,
  `KLING_API_KEY`, `RUNWAY_API_KEY`, `GEMINI_API_KEY`. Run node with `node --env-file=.env`.
