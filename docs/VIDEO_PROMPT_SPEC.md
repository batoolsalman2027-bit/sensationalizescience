# Video Prompt Spec — Sensationalize Science

Target models: **Kling** (text-to-video) and **Runway Gen-3/Gen-4** (image-to-video primary).
Status: proposal for review. No code changes yet.

---

## 0. Diagnosis — why the current clips look like random pictures

Four failure modes, in order of how much damage they do:

**0.1 The prompt names a subject, not a shot.**
`"an intervertebral disc in a spine"` is a description of a *thing*. A video model handed a thing with no specified motion renders one plausible frame and then applies minimal drift to fill the remaining seconds. That drift is the Ken Burns effect you're seeing. It is not a stylistic choice by the model — it's what the model does when the prompt contains no verb.

**0.2 The prompt is conceptual, not physical.**
`"cellular senescence"`, `"drug delivery"`, `"biomechanical loading"` have no visual referent. The model falls back on generic sci-fi imagery — glowing blobs, blue particle fields, floating helices. This is why the disc looked arbitrary: nothing in the prompt constrained *which* disc, *what state* it was in, or *what was happening to it*.

**0.3 Every clip is generated independently.**
No shared style string, no character lock, no first-frame chaining. Eight independent generations of "a spine" produce eight unrelated spines. The video reads as a slideshow because it structurally *is* a slideshow.

**0.4 The prompt asks for too many things at once.**
Two camera moves, three subjects, a scene change, and an on-screen label in one 5-second clip. The model resolves the conflict by picking one element and ignoring the rest — usually the wrong one.

Everything below exists to make these four failures impossible to express in a prompt.

---

## 1. The Shot schema

Stop generating prompt strings directly from the paper. Generate a **structured Shot object**, validate it, then format it per provider. This is the single most important change, and it slots cleanly into the Phase 3 provider abstraction.

```ts
type Scale =
  | 'world' | 'person' | 'body' | 'organ' | 'tissue' | 'cell' | 'molecular';

type CameraMove =
  | 'locked'          // camera still; subject MUST move
  | 'push-in'         // slow dolly toward subject
  | 'pull-out'
  | 'orbit-left' | 'orbit-right'
  | 'tilt-up' | 'tilt-down'
  | 'track-follow'    // camera moves with a moving subject
  | 'rack-focus'      // focus shifts foreground → background
  | 'crane-down';

type Medium =
  | 'live-action'         // real people, real hands, real rooms
  | 'medical-3d'          // anatomical render, clinical, non-glowing
  | 'microscopy'          // phase contrast / fluorescence look
  | 'surgical-pov'
  | 'macro-benchtop'
  | 'volumetric-data';    // computational methods only

interface Shot {
  id: string;
  section: 'motivation' | 'method' | 'results' | 'significance';
  beat: number;

  scale: Scale;
  subject: string;      // ONE concrete physical noun phrase
  action: string;       // REQUIRED. What visibly changes across the clip.
  camera: CameraMove;   // exactly one
  framing: 'wide' | 'medium' | 'close' | 'macro';
  setting: string;      // where, plus lighting
  medium: Medium;

  continuityRef?: string;  // id of a shot whose subject must match exactly
  firstFrameFrom?: string; // id of shot to chain from (Runway I2V)
  negative: string[];
  durationSec: 5 | 10;
}
```

**Validation rules to enforce in code** (reject and regenerate if violated):

| Rule | Check |
|---|---|
| Every shot has motion | `action` is non-empty and contains a present-participle verb |
| One camera move | `camera` is a single enum value, never a compound string |
| Locked camera needs subject motion | if `camera === 'locked'`, `action` must not be a state description |
| No text rendering | `subject` + `action` + `setting` contain none of: *label, text, graph, chart, axis, number, caption, title, UI, screen, readout* |
| Concrete subject | `subject` fails if it matches the abstraction blocklist (§2.2) |
| Entity budget | `subject` contains at most 2 physical entities |

---

## 2. Global rules

### 2.1 The verb rule
Every prompt must contain something that changes over the clip's duration that is **not the camera**. Camera movement alone is Ken Burns. If you cannot name what moves, the shot is wrong and should be a Remotion motion graphic instead of an AI video.

Weak: *a degenerated lumbar disc*
Strong: *fluid seeping from a fissure in the disc's outer ring as the vertebra above settles downward*

### 2.2 The concrete referent rule
No abstraction goes into a prompt. Every abstraction must be translated to a physical, filmable object first. Maintain this mapping table in code:

| Abstraction | Physical referent to prompt |
|---|---|
| inflammation | reddened swollen tissue, dilated capillaries, fluid accumulation at the margin |
| disc degeneration | flattened brown-tinged disc, cracked fibrous outer ring, reduced height between vertebrae |
| fibrosis | pale rigid collagen strands replacing soft tissue, tissue stiffening and contracting |
| drug delivery | viscous translucent gel spreading outward through tissue |
| cell proliferation | cells under phase contrast dividing and filling empty substrate |
| mechanical loading | tissue compressing under a descending platen, then rebounding |
| gene expression | **do not prompt** — motion graphic only |
| statistical significance | **do not prompt** — motion graphic only |
| machine learning model | volumetric point cloud resolving into a coherent anatomical surface |
| STAT3 activation / phosphorylation | **do not prompt** — mechanism diagram only (§3.5) |
| pathway inhibition | **do not prompt** — mechanism diagram only (§3.5) |
| receptor binding, ligand docking | **do not prompt** — mechanism diagram only (§3.5) |
| cytokine signaling | **do not prompt** — diagram the cascade; film the cellular consequence |
| transcription / nuclear translocation | **do not prompt** — mechanism diagram only (§3.5) |

If a concept has no entry, add one before generating. An unmapped abstraction is the single most common cause of a "random" clip.

### 2.3 The no-text rule
AI video models cannot render legible text, numbers, axes, or units. They produce convincing-looking garbage, which is worse than nothing for a science channel — it reads as fabricated data. **All text, labels, values, citations, and figure axes are Remotion overlays.** Never in the generated video.

### 2.4 The entity budget
Max two physical entities per clip. "A surgeon, an assistant, a monitor, and an instrument tray" is four; the model will composite them incoherently. Split into separate shots.

### 2.5 Medium consistency
`medium` is declared explicitly in every prompt and must be identical within a section. Mixing live-action and medical-3d inside the Method section is what makes a video feel assembled from stock.

### 2.6 One beat per clip
A 5-second clip holds exactly one idea. "Zoom from the patient into the spine and then show the disc cracking" is three beats — generate three clips.

### 2.7 The scale floor
Generative video is reliable down to roughly **cell scale** and unreliable below it. A field of cells is something the model has genuinely seen; a phosphorylation event is not.

**Hard rule: `scale === 'molecular'` never reaches a video provider.** It routes to a mechanism diagram (§3.5). Enforce this in `validateShots`, not by convention — molecular prompts are the highest-variance failure in the whole pipeline and they fail *confidently*, producing polished nonsense rather than obvious garbage.

---

## 3. Section templates

### 3.0 Runtime budget — 120 seconds

The current builds run intro-heavy: 30+ seconds spent before the paper has even been stated. The budget below is normative — `ShotPlanner` receives it as a constraint and the packer (§3.6) enforces it.

| Section | Budget | Share | Change from current |
|---|---|---|---|
| **Title card** (title, authors, journal/DOI) | **2s** | 2% | new |
| **Intro** (field → gap → question) | **14s** | 12% | ⬇︎ from 30s+ |
| **Methods** | **30s** | 25% | ⬆︎ |
| **Results** | **56s** | 47% | ⬆︎ |
| **Discussion / significance** | **16s** | 13% | unchanged |
| Slack | 2s | 2% | |
| Total | 120s | 100% | |

Results is now the largest section by a wide margin, which is the correct shape for a paper walkthrough — it carries the evidence, and it's where the figures live.

The key move: the intro is capped at 14s in **absolute** terms, not as a share. Longer total runtime buys more methods and results, never a longer setup.

**Beat costs** — use these to pack a section:

| Beat type | Duration |
|---|---|
| Title card (§3.0.1) | 2s, fixed |
| Generative video shot | 5s |
| Figure establish (whole figure) | 2.5s |
| Panel zoom (each) | 3.5s |
| Mechanism diagram (§3.5, full cascade) | 8s |
| Mechanism diagram (abbreviated, 3 beats) | 5s |
| Transition / match cut | 0.5s (absorb into adjacent beat) |

**Tolerance:** ±2s per section, total must land at 120s ±3s. If a section overruns, the packer drops the lowest-ranked figure beat (§3.6) — it never steals from another section, and it never pads the intro, because a slow intro loses the viewer regardless of total length.

**Hard floors and ceilings:**
- Intro: never below 12s, never above 16s. This ceiling is the whole point of the rebalance — enforce it.
- Results: never below 48s. If figures don't fill it, add a §3.5 Route C consequence shot rather than padding the intro.
- Discussion: fixed at 16s. Do not let it grow to absorb slack.
- No single beat exceeds 10s. Attention decays badly past that.

**Scaling to other runtimes:** the shares (12 / 25 / 47 / 13 + slack) hold at any total. The title card stays 2s regardless. A 90s cut takes the same `Shot[]` plan with a smaller budget and drops the lowest-ranked figures; see §3.6.5.

---

### 3.0.1 Title card (0:00–0:02)

Two seconds, Remotion, opening frame of every video. **Never generative** — this is text, and §2.3 applies absolutely. Its job is attribution and credibility: it tells the viewer immediately that this is a real paper by real people in a real venue, which is the single cheapest trust signal available.

**Content and hierarchy:**

| Element | Treatment | Notes |
|---|---|---|
| **Paper title** | Dominant, largest type | The only element expected to actually be *read* |
| **Authors** | Secondary, ~40% of title size | `First Author et al.` when >3 authors — never a full 20-name list |
| **Journal + year** | Tertiary | e.g. *Nature Biomedical Engineering*, 2024 |
| **DOI** | Smallest, monospace | Present for attribution; not meant to be read at speed |

**The 2-second reading budget.** A viewer reads roughly 8–12 words in two seconds. That's the *title alone* for most papers. Authors, journal, and DOI are credibility texture — visible, deliberately not required reading. Do not try to make all four legible; you'll shrink the title and lose the one thing that matters.

**Rules:**

- **Title overflow:** if the title exceeds ~15 words, scale type down one step and allow three lines. Past three lines, truncate at a clause boundary with an ellipsis — never mid-word, never mid-term.
- **Type floor:** title never below 42px at 1080p equivalent. If it doesn't fit at that size, truncate instead of shrinking further.
- **Motion:** 0.3s fade in, hold, hard cut to intro beat 1. No slide, spin, or typewriter effect — flashy motion on a 2s card costs legibility and reads as content-farm.
- **Background:** solid, drawn from the section palette (§4.1). Not pure black, and not a video frame — a still background maximizes text contrast.
- **Preprint labelling:** if the source is bioRxiv, medRxiv, arXiv, or similar, the venue line **must** read `Preprint — not peer reviewed`. This is a non-optional integrity requirement: presenting a preprint with the visual authority of a published paper misrepresents its evidentiary status, and the label costs nothing.
- **Retraction check:** if the DOI resolves to a retracted or expression-of-concern record, halt the render and surface it for review. Cheap to check via the Crossref API at extraction time, and catastrophic to miss.

```ts
interface TitleCard {
  title: string;
  authorsDisplay: string;   // "Vasquez et al."
  venue: string;            // journal name, or "Preprint — not peer reviewed"
  year: number;
  doi: string;
  isPreprint: boolean;
  durationSec: 2;
}
```

This lands upstream of `ShotPlanner` — it's pure metadata from the PDF, no LLM call needed beyond author-list formatting.

---

### 3.1 Intro — field → gap → question (14s)

**Goal:** orient a lay viewer, establish what's broken, and pose the question the paper answers. Three beats, tight. This section previously ran to 30s+; the discipline here is that *every second not spent on the funnel is a second stolen from results*.

| Beat | Duration | What it shows | Scale | Camera | Medium |
|---|---|---|---|---|---|
| 1 — **Field** | 5s | Lay orientation: a person contending with the pathology. This *is* the field introduction — the human situation says "this video is about degenerative spine disease" faster than any narration | person | `locked` or `track-follow` | live-action |
| 2 — **Gap** | 5s | Scale traversal into the affected region, landing on the pathology actively failing. The limitation of current approaches is carried by narration over this visual | body → organ/tissue | `push-in` | live-action → medical-3d |
| 3 — **Question** | 4s | Hold on the pathology, motion slowing. The research question is posed in narration and as a single on-screen line (Remotion overlay) | tissue | `orbit-left`, slow | medical-3d |

**Beat 1 is where most science videos fail.** A person sitting and looking sad is a stock photo. Prompt an **action the pathology interferes with**: gripping a stair rail, pausing mid-step, bracing against a counter, struggling with a jar lid. Motion + specificity = a shot instead of a picture.

**Beat 2 must show *change*,** not a static anatomical model. The tissue is failing, right now, on camera.

**Beat 3 is new and non-negotiable.** The research question must be stated explicitly, in one sentence, on screen. It's the spine of the whole video — methods answer *how they asked it*, results answer *what they found*, discussion answers *why it matters*. Without it the three later sections have nothing to hang from, which is a large part of why the current cuts feel like disconnected clips.

Note the compression: field orientation and the human stake are now **the same beat**, not two. That single merge recovers most of the 18 seconds.

**Non-medical papers — same funnel, remapped:**
1. **Field** — the system failing in the real world (bridge deflecting, battery swelling, crop wilting).
2. **Gap** — push in to the mechanism responsible, failing at micro scale.
3. **Question** — hold, pose the question.

### 3.2 Method — pick one modality and commit

Choose exactly one from the table below based on the paper's actual methods section. 2–3 beats. Do not mix modalities; a paper with both animal and computational work picks the one that carries the headline result.

| Modality | Canonical subject | Canonical action | Camera | Medium | Avoid |
|---|---|---|---|---|---|
| **Surgical** | Gloved hands + one instrument at an incision site | Instrument advancing, tissue retracting, suture drawing closed | `locked`, macro, shallow depth of field | surgical-pov | Wide OR shots — models render incoherent crowds and fake equipment |
| **Animal** | Gloved hands supporting a rodent on a padded stage; or a rodent walking a gait platform | Careful handling; gait cycle; recovery movement | `locked` or `track-follow` | live-action | Distress imagery, restraint devices, anything that reads as cruelty |
| **Cell / wet lab** | A pipette tip above one well; or cells under phase contrast | Droplet released and diffusing; cells dividing and spreading | `locked` macro; `push-in` for microscopy | microscopy | "Scientist holding a beaker up to the light" — the defining stock cliché |
| **Computational** | A volumetric point cloud or forming mesh | Points resolving into a coherent anatomical surface; mesh deforming under simulated load | `orbit-left` | volumetric-data | A person typing at a laptop. Never. It shows nothing and looks like an ad |
| **Benchtop** | One moving part of the instrument — a platen, a stage, a clamped specimen | Specimen compressing under load, fracturing, rebounding | `locked` macro or `rack-focus` | macro-benchtop | Full-lab wide shots |

Method shots are about **hands and process**. The camera should be close enough that the frame contains a mechanism, not a room.

### 3.3 Results — stop using AI video here

This is the most important section-level rule in this document.

**Results are the paper's evidence. Generative video cannot represent evidence honestly** — it cannot render an axis, it cannot preserve a trend direction, and if it invents a curve it is fabricating data on a science channel. Results are motion graphics.

Three permitted patterns:

**(a) Data reveal — Remotion, deterministic.** Extract the actual values or the actual figure panel from the paper. Axes draw in, series animates along its true path, a callout annotates the key comparison. This is the primary results visual and should carry most of the section.

**(b) Physical re-enactment — AI video, no numbers.** A short clip showing the *phenomenon* the data measured — treated tissue withstanding a load that cracked the untreated sample. This intercuts with (a) to keep the section from feeling like a slide deck. It illustrates; it does not assert a number.

**(c) Figure parallax — Runway I2V on the real figure image, ≤3% motion, ≤3 seconds.** This is the one legitimate use of a Ken Burns move in the entire spec: the source image is the actual, unaltered figure, so slow motion over it is honest. Use sparingly.

Composition: lead with (a) or (c), intercut (b). Never generate a "graph" with Kling or Runway text-to-video.

### 3.4 Significance — reverse the zoom

**Goal:** structural payoff. Retrace the intro's scale chain outward.

| Beat | Scale | What it shows | Camera |
|---|---|---|---|
| 1 | tissue → organ | Pull back out from the repaired/understood mechanism | `pull-out` |
| 2 | person | **The same human from beat 1 of the intro**, now performing the action they struggled with | `locked` or `track-follow` |
| 3 (optional) | world | Population-scale implication — only if the paper genuinely supports the claim | `crane-down` or `pull-out` |

Beat 2 requires `continuityRef` pointing at the intro's beat 1, with the character-lock string reused **verbatim** (§4.2). The visual rhyme — same person, same place, different capability — is what makes the video feel authored rather than assembled.

Avoid for beat 3: rotating globes, glowing network graphics, holographic interfaces, diverse-people-smiling montages. These signal "stock" instantly. Prefer a concrete future scene: a clinic corridor, a rehab room, a field.

Honesty note: if the paper is a rat model, beat 3 should not imply a human cure. Keep the significance claim at the paper's actual evidentiary level.

---

### 3.5 Mechanism and molecular content — the STAT3 problem

**Symptom:** the video holds together through motivation and method, then collapses into generic glowing abstraction the moment the narration reaches *"STAT3 was activated and downstream pathways were inhibited."*

**Why it happens — three compounding reasons:**

1. **No visual referent exists.** STAT3 activation is a conformational change in a protein below the wavelength of visible light. There is no "correct" footage of it, so there is nothing for the model to be faithful to.
2. **A pathway is a graph, not a scene.** "X activates Y, which inhibits Z" is a statement about *causation*, not about objects arranged in space. Video renders space. Asking it to render a causal relation is a category error — the model has no way to depict "inhibits."
3. **The training data is stock footage.** The model has seen these terms attached almost exclusively to generic biotech b-roll: rotating helices, blue particle fields, glowing cells. So it returns the average of that, which is precisely the "random" output you're seeing.

No amount of prompt engineering fixes this, because the failure isn't in the phrasing. **Mechanism is a diagram. Diagrams are Remotion.**

---

#### Route A — Pathway motion graphic (primary)

Render the cascade as an actual node-edge diagram with the standard molecular-biology visual grammar. Because it's Remotion, real gene and protein names are legible text — which is exactly what this content needs.

**Visual grammar — use the field's conventions, they read as competence:**

| Element | Convention |
|---|---|
| Activation | Pointed arrow, `→` |
| Inhibition | Blunt bar-ended connector, `⊣` |
| Phosphorylation | Small circled **P** appearing on the node |
| Translocation | Dashed arrow between compartments |
| Knockdown / inhibited node | Node desaturates and dims, edge greys out |
| Compartments | Horizontal bands: membrane / cytoplasm / nucleus |

**Beat structure for a signaling cascade (~10s, six beats):**

1. Compartment bands establish — membrane, cytoplasm, nucleus.
2. Ligand arrives at the receptor; receptor node activates.
3. Circled **P** appears on the STAT3 node; two monomers converge into a dimer.
4. Dashed arrow; the dimer moves down into the nucleus band.
5. Target gene nodes illuminate in sequence.
6. Inhibitor enters, a bar-ended connector appears, downstream nodes dim in cascade order.

Every beat is deterministic, legible, and *correct*. It also cuts cost — this is a Remotion composition, not six generations.

The STAT3 cascade is unusually well suited to this because it has genuine spatial structure: receptor at the membrane, dimerization in the cytoplasm, translocation into the nucleus. The diagram isn't a compromise; it's a better representation of the biology than any video could be.

---

#### Route B — Real structures instead of imagined ones

If you want an actual protein on screen, don't ask a model to invent one. Fetch the real solved structure from the RCSB Protein Data Bank and render it with **Mol\*** or **PyMOL**, scripting a slow orbit and exporting frames.

- Search RCSB for the protein by name; for STAT3 the classic entry is the STAT3β homodimer bound to DNA (**1BG1**) — verify the entry before using it, and cite the PDB ID on screen.
- Mol\* runs headless and can be driven from Node, so this fits your existing render pipeline.
- Output is accurate, reproducible, free, and citable — three properties generative video cannot offer here.

A slow orbit around a real, cited structure is dramatically more credible than a glowing invented blob, and it costs nothing per render.

---

#### Route C — Split the claim: mechanism vs. consequence

This is the reframe that makes the section watchable rather than just accurate.

Almost every molecular claim in a paper has a **cellular or organismal consequence**, and the consequence *is* filmable — it sits at or above the scale floor (§2.7).

> **"STAT3 activation drives proliferation; pathway inhibition suppressed tumor growth"**
>
> - **Mechanism** → Route A diagram: receptor → JAK → phospho-STAT3 → dimer → nucleus → target genes, then the inhibitor bar-ending the cascade.
> - **Consequence** → Kling/Runway, cell scale, fully in-distribution:
>
>   *"phase contrast microscopy footage, a dense field of cultured cells dividing and steadily filling the empty substrate between them, locked-off camera, high magnification, even diffuse illumination, [STYLE_BIBLE]"*
>
>   then the paired inhibited condition:
>
>   *"phase contrast microscopy footage, a sparse field of cultured cells remaining static as gaps between them persist, a few cells rounding up and detaching, locked-off camera, high magnification, even diffuse illumination, [STYLE_BIBLE]"*

Intercut: diagram for the *how*, video for the *what happened*. The narration carries the molecular language; the diagram carries the logic; the video carries the stakes. Nothing is asked to do a job it can't.

Note both consequence prompts obey §2.1 — cells *dividing and filling*, cells *rounding up and detaching*. Verbs, at cell scale, in a medium the model has actually seen.

---

#### Detection — the classifier step

The only ML you need here is a cheap classification call inside `ShotPlanner`, not a trained model. Tag every planned beat:

```ts
type ContentClass =
  | 'human-scale'     // → generative video
  | 'organ-tissue'    // → generative video
  | 'cellular'        // → generative video (scale floor)
  | 'molecular'       // → Route A diagram, never video
  | 'structural'      // → Route B, PDB render
  | 'quantitative';   // → Remotion motion graphic (§3.3)
```

Route on the tag before any provider is selected. One extra LLM call per paper, and it eliminates the entire failure class — a far better return than anything a custom model would buy you.

---

### 3.6 Figure selection and allocation

**The current figure rendering stays as-is** — it works and shouldn't be touched. What changes is *how many* figures get pulled, *which section* each one lands in, and *when* a panel zoom is granted.

#### 3.6.1 Core principle: route by role, not by paper order

A paper's figure numbering reflects the manuscript's argument, not a video's. Figure 1 is usually a study-design schematic — that belongs in **Methods**, not the intro. A histology panel buried in Figure 4 may be the clearest possible illustration of the technique, and also belongs in Methods.

So: extract every figure, classify each by **role**, and assign the section from the role. Never assume paper order maps to video order.

| Role | Usually appears as | Video section | Base weight |
|---|---|---|---|
| `schematic` | Study design, workflow, device diagram (often Fig 1) | **Methods** | 3 |
| `apparatus` | Photo of rig, setup, instrument | **Methods** | 2 |
| `representative-image` | Histology, micrograph, imaging, gel | **Methods** if illustrating technique; **Results** if showing outcome | 3 |
| `primary-outcome` | The headline quantitative figure | **Results** | 5 |
| `secondary-outcome` | Supporting quantitative panels | **Results** | 3 |
| `mechanism` | Pathway / signaling diagram | **§3.5 Route A** (redrawn, not shown as-is) | 3 |
| `supplementary` | Supp. figures, controls, QC | **Cut** unless referenced in the abstract | 0 |

Note `mechanism`: a pathway figure from the paper is a *source* for the Route A diagram, not something to put on screen directly. Paper pathway figures are dense, small-type, and print-oriented — illegible on a phone.

#### 3.6.2 Ranking

Even at two minutes you cannot show everything. Score each figure, sort within its section, and pack greedily:

```
score = base_weight
      + 3  if referenced in the abstract
      + 2  if referenced in the paper's conclusions
      + 1  if the generated narration mentions it
      - 2  if panel_count > 6        // too dense to read on a phone
      - 1  if the figure is > 60% text/table
```

Cut everything below a threshold rather than compressing it — four figures with room to breathe beats seven flashing past.

#### 3.6.3 Panel handling

Per the chosen approach: **establish the whole figure, then zoom only when the narration actually distinguishes panels.**

1. Always open on the **whole figure**, 2.5s. This gives context and preserves the paper's own composition.
2. Grant a **panel zoom (3.5s each)** only if the narration for that figure addresses **two or more panels distinctly**.
3. If narration addresses a single panel, establish and hold with a ≤3% push-in — no zoom.
4. **Cap at 3 panel zooms per figure.** Beyond that the figure is doing too much; drop the lowest-scoring panels.
5. Panel bounding boxes come from caption parsing (`(A)`, `(B)`, …) plus layout detection; fall back to a vision call when the caption doesn't enumerate panels.

#### 3.6.4 Reference layout at 120s

A concrete packing that lands on budget — use as the planner's target shape:

| Section | Beats | Time |
|---|---|---|
| **Title card** | Title · authors · venue/DOI (§3.0.1) | **2s** |
| **Intro** | Field 5s · Gap 5s · Question 4s | **14s** |
| **Methods** | Schematic establish 2.5s + 2 panel zooms 7s · method video shot 5s · method video shot 5s · representative image 2.5s + 1 zoom 3.5s · apparatus 2.5s | **28s** |
| **Results** | Primary figure establish 2.5s + 3 panel zooms 10.5s · secondary A establish 2.5s + 2 zooms 7s · secondary B 2.5s + 1 zoom 3.5s · secondary C 2.5s + 1 zoom 3.5s · secondary D 2.5s · consequence shot 5s · paired condition shot 5s · mechanism diagram (full cascade) 8s | **55s** |
| **Discussion** | Pull-out 5s · return to human 5s · significance 5s | **15s** |
| Slack | | 6s |
| **Total** | | **120s** |

That's **7 figures on screen** (2 in methods, 5 in results) plus one redrawn mechanism diagram, with 8 panel zooms distributed across them. For most papers that genuinely is "almost all the relevant figures" — the ones that fall off the list are typically supplementary panels and QC controls, which is the right thing to cut.

The 8s of slack is deliberate: it absorbs narration overrun without forcing a figure drop. If narration consistently lands short, promote the next-ranked figure rather than lengthening existing beats.

#### 3.6.5 When a paper still doesn't fit

Two minutes covers most papers. Figure-dense ones (10+ figures, 40+ panels) still won't fit at legible pacing. In priority order:

1. **Rank and cut.** Take the top 7 by score. The scoring already favours abstract- and conclusion-referenced figures, which is a decent proxy for what the authors themselves think matters.
2. **Two cuts from one plan.** A 120s version and a 3–4 minute version, from the same `Shot[]` with a different budget. Everything upstream is shared, so the marginal cost is one extra render — worth adding once the pipeline is stable.
3. **Merge related panels into one composite beat.** Two small panels making the same point can share a single establish shot with two sequential zooms, at 9.5s instead of 12s. Modest saving, some legibility cost.

Do **not** solve overflow by shortening beats below their listed costs. A 1.5s figure establish is unreadable, and an unreadable figure is worse than a cut one — it signals padding.

---

## 4. Continuity system

### 4.1 Style bible
One constant appended to every prompt in a video. Same string, every shot, no exceptions.

```ts
const STYLE_BIBLE =
  "cinematic documentary, shallow depth of field, soft directional key light, " +
  "desaturated cool palette with warm skin tones, 35mm, subtle film grain, " +
  "no glowing effects, no lens flare";
```

Per-section palette shift is allowed (motivation cooler, significance warmer) but the *medium and lens language* stays fixed.

### 4.2 Character lock
When a person recurs, lock the description as an exact reusable string:

```ts
const SUBJECT_A =
  "a woman in her early 60s, short silver hair, navy cardigan, no jewelry";
```

Reuse it byte-identical in intro beat 1 and significance beat 2. Paraphrasing produces a different person. On Runway Gen-4, additionally use References with the same seed image.

### 4.3 Frame chaining
For adjacent shots inside a section, take the final frame of shot *n* as the first frame of shot *n+1* via Runway image-to-video (`firstFrameFrom`). This eliminates the between-clip jump that makes a sequence read as separate images. Chain within a section only — deliberate cuts between sections are good.

### 4.4 Standard negative list

```ts
const NEGATIVE_BASE = [
  "text", "letters", "numbers", "labels", "captions", "watermark", "logo",
  "graphs", "charts", "axes", "user interface", "screens",
  "extra fingers", "deformed hands", "distorted anatomy",
  "glowing particles", "neon", "sci-fi hologram", "lens flare",
  "camera shake", "rapid cuts", "morphing", "warping"
];
```

Add `"smiling at camera", "stock photo"` for any live-action shot.

---

## 5. Provider adapters

The Shot object is provider-neutral. Each adapter is a pure function `(shot: Shot) => ProviderRequest`.

### 5.1 Kling — text-to-video

Kling responds well to explicit cinematography vocabulary and honors a separate negative prompt field.

**Format order:** `[medium] + [subject] + [action] + [camera] + [setting/lighting] + [style bible]`

**Rules:**
- Target **60–100 words**. Beyond ~120 the prompt dilutes and Kling starts dropping clauses.
- Use the dedicated `negative_prompt` field — do not put negations in the positive prompt. "No text" in a positive prompt often *summons* text.
- Camera phrasing Kling reliably understands: *"the camera slowly pushes in"*, *"slow orbit around the subject"*, *"locked-off camera"*, *"the camera tilts down"*.
- Specify motion **speed**: unqualified motion prompts produce either a frozen frame or a lurch. Always write *slowly*, *gradually*, or *steadily*.
- Kling drifts when under-specified. If `camera === 'locked'`, say so explicitly — silence is not interpreted as a static camera.

```ts
function formatKling(shot: Shot): KlingRequest {
  return {
    prompt: [
      MEDIUM_PHRASE[shot.medium],
      shot.subject,
      shot.action,
      CAMERA_PHRASE_KLING[shot.camera],
      shot.setting,
      STYLE_BIBLE,
    ].join(", "),
    negative_prompt: [...NEGATIVE_BASE, ...shot.negative].join(", "),
    duration: shot.durationSec,
    cfg_scale: 0.5,
  };
}
```

### 5.2 Runway Gen-3 / Gen-4 — image-to-video primary

The central adapter difference: **on Runway, do not describe the scene.** The scene is in the input image. Re-describing it makes the model fight its own conditioning and produces morphing artifacts.

**Rules:**
- Always prefer image-to-video. Generate or select the first frame separately (still-image model, a real photo, or the actual figure panel), then prompt **motion only**.
- Target **20–40 words**. Runway prompts should be shorter than Kling prompts by roughly half.
- Format: `[camera move]. [subject motion].` Two sentences, nothing else.
- No negative prompt support. Express avoidance **positively**: write *"locked-off camera, steady frame"* rather than *"no camera shake"*.
- Gen-4 References: pass the character-lock reference image on every shot containing a recurring person.
- Runway's motion is conservative by default — if a shot needs visible change, name it explicitly and give it a direction.

```ts
function formatRunway(shot: Shot): RunwayRequest {
  return {
    promptImage: resolveFirstFrame(shot),          // chained or generated
    promptText: `${CAMERA_PHRASE_RUNWAY[shot.camera]}. ${shot.action}.`,
    ratio: "1280:768",
    duration: shot.durationSec,
    references: shot.continuityRef
      ? [referenceImageFor(shot.continuityRef)]
      : undefined,
  };
}
```

### 5.3 Routing heuristic

| Shot type | Provider |
|---|---|
| Opening shot of a section (no prior frame) | Kling T2V |
| Continuation within a section | Runway I2V, chained |
| Recurring character | Runway Gen-4 + References |
| Figure parallax | Runway I2V on the real figure image |
| Fast, complex subject motion | Kling |

---

## 6. Worked example

**Paper (representative):** *An injectable self-healing hydrogel restores disc height in a rat model of intervertebral disc degeneration.*

Character lock: `SUBJECT_A = "a man in his late 50s, close-cropped grey beard, olive work shirt"`

---

**Shot 1 — motivation, beat 1** · person · live-action · `locked` · 5s

> **Kling:** cinematic documentary footage, a man in his late 50s, close-cropped grey beard, olive work shirt, gripping the edge of a kitchen counter and lowering himself slowly onto a stool, pausing halfway as his weight shifts, locked-off camera at chest height, early morning light through a window behind him, cinematic documentary, shallow depth of field, soft directional key light, desaturated cool palette with warm skin tones, 35mm, subtle film grain, no glowing effects, no lens flare
>
> **negative:** text, letters, numbers, labels, captions, watermark, logo, graphs, charts, axes, user interface, screens, extra fingers, deformed hands, distorted anatomy, glowing particles, neon, sci-fi hologram, lens flare, camera shake, rapid cuts, morphing, warping, smiling at camera, stock photo

Note the action: *lowering himself and pausing*. Not "a man with back pain." The pathology is expressed through interfered-with movement.

---

**Shot 2 — motivation, beat 2** · body · medical-3d · `push-in` · 5s

> **Kling:** clinical anatomical render, the lower back of a standing human figure with the skin fading to translucent to reveal the lumbar spine beneath, the vertebrae becoming steadily more defined as surrounding tissue clears, the camera slowly pushes in toward the lower spine, neutral grey studio void, soft top light, cinematic documentary, shallow depth of field, desaturated cool palette, 35mm, subtle film grain, no glowing effects, no lens flare

---

**Shot 3 — motivation, beat 3** · tissue · medical-3d · `orbit-left` · 5s
`firstFrameFrom: shot-2`

> **Runway:** Slow orbit to the left around the disc. The disc gradually flattens as the vertebra above settles downward, and a fissure opens across the fibrous outer ring.

Short. Motion only. The disc's appearance comes from shot 2's final frame, so it is *the same disc* — this is what kills the "random disc" problem.

---

**Shot 4 — method, beat 1 (animal modality)** · person · live-action · `locked` · 5s

> **Kling:** macro laboratory footage, two gloved hands steadying a small rodent on a padded surgical stage, the hands adjusting position gently and withdrawing, locked-off camera directly above at close range, shallow depth of field, even diffuse overhead light, cinematic documentary, desaturated cool palette, 35mm, subtle film grain, no glowing effects, no lens flare

---

**Shot 5 — method, beat 2** · tissue · surgical-pov · `locked` · 5s

> **Kling:** surgical macro footage, a fine needle tip positioned against the outer wall of an intervertebral disc, a translucent gel emerging from the needle and spreading slowly outward through the tissue, locked-off camera, extremely shallow depth of field, focused pool of surgical light, cinematic documentary, desaturated cool palette, 35mm, subtle film grain, no glowing effects, no lens flare

Note: gel *spreading* is the verb. "A hydrogel injection" would have produced a still frame.

---

**Shot 6 — results, primary** · Remotion motion graphic, **not** generated

Disc height ratio, treated vs. untreated, over 12 weeks. Axes draw in left-to-right, both series animate along their real values from the paper, divergence point annotated. Values and units are real text, rendered in Remotion. No AI video involved.

---

**Shot 7 — results, intercut** · tissue · medical-3d · `locked` · 5s

> **Kling:** clinical anatomical render, two intervertebral discs side by side under a descending flat platen, the left disc compressing and rebounding while the right disc compresses further and stays flattened, locked-off camera at disc level, neutral grey studio void, soft top light, cinematic documentary, desaturated cool palette, 35mm, subtle film grain, no glowing effects, no lens flare

Shows the phenomenon. Asserts no number. The number lives in shot 6.

---

**Shot 8 — significance, beat 1** · tissue → body · medical-3d · `pull-out` · 5s
`firstFrameFrom: shot-7`

> **Runway:** Slow pull back from the disc. Surrounding vertebrae and then the full lumbar spine come into frame as the disc recedes.

---

**Shot 9 — significance, beat 2** · person · live-action · `locked` · 5s
`continuityRef: shot-1`

> **Runway (Gen-4 + Reference from shot 1):** Locked-off camera, steady frame. The man lowers himself onto the stool in one continuous movement and settles, then reaches forward for a mug.

Same man, same kitchen, same camera position as shot 1 — the movement that was interrupted now completes. That rhyme is the entire emotional payload of the video, and it costs one reference image.

---

## 7. Anti-pattern reference

| Instead of this | Write this | Why |
|---|---|---|
| "an intervertebral disc in a spine" | "the disc flattening as the vertebra above settles downward" | No verb → Ken Burns |
| "cellular senescence" | "cells under phase contrast slowing and enlarging, ceasing to divide" | No physical referent → sci-fi blob |
| "a graph showing significant improvement" | *(Remotion motion graphic)* | Model fabricates fake axes |
| "camera zooms in and pans right" | "the camera slowly pushes in" | Two moves → model picks neither cleanly |
| "a busy research lab with scientists working" | "two gloved hands adjusting a pipette above a well plate" | Entity budget; wide shots hallucinate |
| "a scientist holding a beaker to the light" | *(delete; use the real method)* | Defining stock cliché |
| "a man with chronic back pain" | "a man gripping a counter and lowering himself slowly, pausing halfway" | State → portrait; action → shot |
| "no camera shake" *(Runway)* | "locked-off camera, steady frame" | Runway has no negative prompt |
| "futuristic medical breakthrough concept" | "a clinic corridor, a physiotherapist steadying a patient's first steps" | Abstractions produce holograms |

---

## 8. Implementation notes

Where this lands in the pipeline:

1. **`ShotPlanner`** — one LLM call per paper. Input: parsed paper sections + extracted figures. Output: `Shot[]` as validated structured JSON. This call sees the section templates in §3 as its system prompt and never emits prompt strings.
2. **`classifyContent(shot)`** — the §3.5 `ContentClass` tag. Runs before provider selection and is the gate that keeps molecular content out of Kling and Runway.
3. **`validateShots(shots)`** — the §1 rules table plus the §2.7 scale floor, as pure functions. Failures regenerate the individual shot, not the whole plan.
4. **`formatKling` / `formatRunway`** — pure formatting, no LLM. These are the provider adapters Phase 3 already calls for.
5. **`resolveFirstFrame`** — resolves `firstFrameFrom` chains; must run in shot order.
6. **Remotion router** — three classes bypass video generation entirely and emit a Remotion composition spec instead: `quantitative` (§3.3), `molecular` (§3.5 Route A), and `structural` (§3.5 Route B, via a headless Mol\* render step).
7. **`extractFigures(pdf)`** — pulls *every* figure with its caption, panel bounding boxes, and in-text reference locations. Must run before `ShotPlanner` so the planner can allocate against real figures rather than inventing beats.
8. **`classifyFigureRole(figure)`** — the §3.6.1 role taxonomy. Determines target section. Runs per figure, batched into one call.
9. **`packSection(shots, budget)`** — the §3.0 beat costs and §3.6.2 ranking, greedy fill. Pure function, fully unit-testable: assert every section lands within tolerance and the total hits 120s ±3s. This is the highest-value test in the pipeline because pacing regressions are invisible until you watch the whole render.

Two things worth doing before any of this ships:

- **Abstraction map coverage check.** Before generating, scan the planned shots for subjects with no entry in the §2.2 table and surface them for review. An unmapped abstraction is the highest-yield failure signal you have.
- **Cost guard.** Chained I2V means a bad shot 2 poisons shots 3–5. Generate section-openers first, approve, then chain.

---

## 9. Open questions for you

1. Do you have figure data extraction working, or only figure *images*? §3.3(a) needs values; without them, fall back to §3.3(c) parallax on the panel image.
2. Is there a human-in-the-loop approval step between shot planning and generation? The cost guard in §8 assumes one.
3. Should the significance section's claim level be enforced programmatically (e.g., animal-model papers blocked from human-outcome imagery), or left to review?
