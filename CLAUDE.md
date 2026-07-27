# Sensationalize Science

Turns scientific papers into short explainer videos. Next.js app; Remotion for
deterministic motion graphics; external AI video providers (Kling, Runway) for
generative shots.

## Video prompt generation

**Read `docs/VIDEO_PROMPT_SPEC.md` before editing anything in the shot planning
or video provider paths.** It is the source of truth for how paper content
becomes shots.

The rules that get violated most often, in order:

1. **Every generated shot needs a verb.** A prompt describing a subject with no
   motion produces a static frame with drift — the "Ken Burns" failure.
2. **Molecular content never reaches a video provider.** Pathways, signaling,
   phosphorylation, receptor binding → Remotion diagram (spec §3.5). Video
   models fail on these *confidently*, producing polished nonsense.
3. **No text in generated video, ever.** Labels, axes, numbers, captions and
   citations are Remotion overlays (§2.3). A hallucinated axis on a science
   channel is fabricated data.
4. **The intro is capped at 14s in absolute seconds**, not as a share of
   runtime (§3.0). Longer videos buy more methods and results, never a longer
   setup.
5. **Figures route by role, not by paper order** (§3.6). A Figure 1 workflow
   schematic belongs in Methods.

## Runtime budget

120s target: title card 2s · intro 14s · methods 30s · results 56s ·
discussion 16s · 2s slack. Enforced by the packer; see §3.0 and §3.6.4.

## Integrity requirements

- Preprints (bioRxiv/medRxiv/arXiv) must be labelled `Preprint — not peer
  reviewed` on the title card.
- DOIs are checked against Crossref for retractions at extraction time; a
  retraction or expression of concern halts the render.
- Significance claims stay at the paper's evidentiary level — an animal-model
  result must not imply a human outcome.

## Conventions

- Local renders depend on the ffmpeg-based MP3 duration probe in `lib/audio.ts`
  and `lib/render.ts`. Do not replace it with `music-metadata`.
- `poc/out/` and `.manim-venv/` are build artifacts and stay gitignored.
