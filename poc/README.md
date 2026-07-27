# Paper → Documentary video pipeline (PoC)

Turns a scientific paper into a short, narrated **documentary** video: a human
hook, animated pathology, honest methods, and a figure-driven results section,
composited with recreated data-accurate charts and mechanism diagrams.

Worked example: `examples/bmsc-ivdd/` (Scientific Reports 2025,
`s41598-025-00278-x` — BMSC hydrogels / disc degeneration / ferroptosis).
Final render was ~127s, 16:9.

---

## How it works (two layers)

1. **Cinematic layer** — AI video (Kling / Runway / Veo) for human + tissue +
   cell-scale shots. Prompts are **structured Shot objects**, never freeform
   strings (see `lib/shot.mjs` and `docs/VIDEO_PROMPT_SPEC.md`).
2. **Data-accurate layer** — recreated charts (Manim) from digitized figure
   values, plus mechanism **diagrams** (Route A). Anything molecular or
   quantitative is routed here, never to a video model.

Routing (`lib/shot.mjs → routeShots`): `human-scale / organ-tissue / cellular`
→ video provider; `quantitative` → recreated chart; `molecular` → pathway
diagram; `structural` → PDB render (not built yet).

---

## Prerequisites (one-time)

```bash
# system deps (Homebrew)
brew install py3cairo pango ffmpeg pkg-config poppler
# Manim in a venv (gitignored)
python3 -m venv .manim-venv && source .manim-venv/bin/activate
pip install manim importlib_metadata numpy pillow scipy
# node deps for the .mjs scripts (Node 24)
npm install   # @anthropic-ai/sdk is the main one
```

`.env` keys used: `ANTHROPIC_API_KEY` (brief/storyboard/shots + digitization),
`GEMINI_API_KEY` (Veo), `RUNWAY_API_KEY`, `KLING_API_KEY`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`. Run node scripts with `node --env-file=.env …`.
Prefix Manim/ffmpeg commands with `eval "$(/opt/homebrew/bin/brew shellenv)"`.

Fonts: Montserrat TTFs live in `assets/fonts/` and are registered at runtime by
each Manim script (no system install).

---

## Generating a video for a NEW paper

### 1. Ingest the PDF
Drop the paper at `sample/paper.pdf`, then:
```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
pdftotext -layout sample/paper.pdf out/paper.txt
pdftoppm -png -r 150 sample/paper.pdf out/pages/p     # page images
```

### 2. Recreate the quantitative figures  *(manual, paper-specific)*
For each **bar-chart** figure worth showing:
1. Crop the panel(s) from the page PNG (ffmpeg `crop`).
2. Write a spec `out/figN-spec.json` (panel ids, axis titles/units, group labels).
3. Digitize: `node --env-file=.env scripts/digitize.mjs <crop.png> out/figN-spec.json out/figN-digitized.json`
4. Copy `scripts/fig3_manim.py` → `scripts/figN_manim.py`, point it at the new
   digitized JSON, adjust the condition matrix / group count. Render to
   `out/figN_manim.mp4`.

Non-chart panels (MRI, histology, blots) aren't recreated as vector charts.

### 3. Brief → Shot plan → media
```bash
node --env-file=.env scripts/extract_brief.mjs        # → out/paper-brief.json  (set DOI via PAPER_DOI env for the title card)
node --env-file=.env scripts/build_shots.mjs          # → out/shots.json (structured Shot[], routed)
node --env-file=.env scripts/gen_clips.mjs            # DRY RUN — prints plan + cost
node --env-file=.env scripts/gen_clips.mjs --go --models kling   # ⚠️ SPENDS — video shots only
node --env-file=.env scripts/narrate_shots.mjs --go   # → out/audio/<id>.mp3 (ElevenLabs)
```
`build_shots.mjs` emits `render:"chart"` shots (with a `figure` id) and
`render:"diagram"` shots — edit the prompt there if the paper's figures/mechanism
differ. **Money gate: `gen_clips` is safe by default; `--go` is required to spend.**

### 4. Mechanism diagram  *(manual, if the paper has a pathway)*
Copy `scripts/stat3_diagram.py`, rebuild the node-edge cascade for the paper's
mechanism → `out/<mech>_diagram.mp4`.

### 5. Title card + section labels
```bash
PAPER_DOI=10.xxxx/yyyy manim -qh --format=mp4 -o title_card scripts/title_card.py Title
for w in "INTRODUCTION:01:intro" "METHODS:02:methods" "RESULTS:03:results"; do
  IFS=: read word idx name <<< "$w"
  SECTION_WORD=$word SECTION_IDX=$idx manim -qh -s -t --format=png -o label_$name scripts/label_card.py Label
done
```

### 6. Composite
Adapt the composite script (see `examples/bmsc-ivdd/build_final.sh`): map each
Shot id → its Kling clip / recreated figure / diagram, mux the matching
`audio/<id>.mp3`, and overlay the section labels on the first shot of each
section. Video shots keep their native length with narration time-stretched to
fit; charts/diagrams are held for the narration.

---

## What's automated vs. manual

| Stage | Automated | Manual per paper |
|---|---|---|
| Ingest text/pages | ✅ | crop figure panels |
| Figure digitize + recreate | digitize is automated | write the per-figure Manim script |
| Brief / Shot plan / routing | ✅ | tune `build_shots` prompt |
| Video shot generation | ✅ | — |
| Narration | ✅ | — |
| Mechanism diagram | — | hand-build (Route A) |
| Title / section labels | ✅ | — |
| Composite | — | map shots→assets in the build script |

Not yet built: automated `extractFigures`, a general Route A diagram engine,
Route B (Mol\* PDB), and Runway image-to-video frame-chaining (see the spec).

## Costs (per ~2-min video, economy)
Kling ~0.6 units/sec (5s ≈ 3 units, 10s ≈ 6); ~11 shots ≈ ~45 units. Veo 3.1
Fast $0.15/s. Runway gen4.5 ~$0.4/clip. ElevenLabs bills per character
(~2k chars ≈ negligible). Claude text calls ≈ cents. **Always dry-run and get
approval before a `--go`.**
