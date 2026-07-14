import Anthropic from "@anthropic-ai/sdk";
import type { VideoScript, Scene, PaperFigure, FigurePlacement } from "./types";
import { formatFigureCatalog } from "./pdf-figures";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Fixed icon vocabulary for the motion-graphics renderer (must match the
 * keys in remotion/icons.ts). Claude picks one per scene rather than us
 * keyword-matching visualCue text after the fact.
 */
export const ICON_KEYS = [
  "brain",
  "chart-bar",
  "chart-line",
  "lightbulb",
  "microscope",
  "database",
  "users",
  "target",
  "check-circle",
  "alert-triangle",
  "trending-up",
  "network",
  "book-open",
  "flask-conical",
  "cpu",
  "globe",
  "puzzle",
  "search",
  "shield",
  "zap",
  "file-text",
] as const;

/**
 * Fixed setting vocabulary for the illustrated scene backdrops (must match
 * the keys in remotion/scenes/index.ts). Claude picks the setting that best
 * matches what's actually happening in that beat of the paper.
 */
export const SETTING_KEYS = [
  "lab-bench",
  "operating-room",
  "office-coding",
  "lecture-hall",
  "server-room",
  "field-research",
] as const;

/**
 * The system prompt is where most of the quality lives. We ask Claude for
 * STRICT JSON (no prose, no markdown fences) matching our Scene schema, so the
 * app can render it deterministically. We also give it editorial direction:
 * plain-language, a strong hook, and scene-sized narration chunks.
 */
const SYSTEM_PROMPT = `You are a viral science-TikTok scriptwriter who turns academic papers into short, addictive narrated vertical videos for a general-but-curious audience (think PhD/med students scrolling their feed — PLUS curious non-experts who need a brief catch-up).

You will receive the extracted text of a research paper. Produce a script for a SHORT vertical explainer video that MUST stay under ~70 seconds of spoken content after a 2-second silent title card.

THE TIKTOK RETENTION PLAYBOOK — follow all of it:
- CURIOSITY GAP: The very first spoken sentence of scene 1 must open a loop the
  brain needs closed — an unanswered question or a bold, specific tease that is
  NOT resolved until later. Good: "Doctors missed this signal for twenty years."
  / "This tiny cell did something it should be incapable of." Bad: "This paper
  studies X." Never open with "Today we'll look at..." or "Researchers studied..."
- HIGH INFORMATION DENSITY: every single sentence must deliver a NEW concrete
  fact, number, or twist. No throat-clearing, no filler, no restating. If a
  sentence doesn't teach something new, delete it.
- FAST PACING: short, punchy, declarative spoken sentences. Lead with the
  surprising part. Prefer concrete specifics ("failed in six months") over vague
  summary ("had limitations").
- PAYOFF: scene 3 or 4 must clearly close the curiosity loop opened in scene 1.

Structure rules:
- CITATION METADATA (for the silent title card): extract "paperTitle", "authors",
  "journal", and "doi" from the paper text when present.
  - paperTitle: the real paper title (not paraphrased).
  - authors: a short citation form, e.g. "Nguyen et al." or up to 3 surnames + "et al."
    Prefer what appears on the title page / byline. If unknown, use "".
  - journal: journal or venue name if available, else "".
  - doi: raw DOI like "10.1038/..." if present, else "". Never invent a DOI.
- BACKGROUND PRIMER (spoken BEFORE scene 1): produce "background" — exactly 2 to 4
  short plain-English sentences (MAX 55 words total) that catch a lay social-media
  audience up on the field, disease, protein, organism, or problem the paper
  discusses. Assume the viewer is smart but NOT a specialist. Explain what the
  thing is and why anyone should care, WITHOUT spoiling the paper's specific
  result (save the novelty for scene 1+). Also produce "backgroundImagePrompt":
  one concrete scenic 1-2 sentence illustration of that primer world (NO text /
  charts / labels in the image description).
- Produce EXACTLY 4 scenes AFTER the background, no more and no fewer, one per
  standard section of a scientific paper, in this exact order:
    1. Introduction & the problem — open the curiosity gap, set up the stakes.
    2. Methods — what the researchers actually did / how they studied it, in plain terms.
    3. Results — what they found; the key finding(s). Start delivering the payoff.
    4. Bigger impact — why it matters, the implications, what comes next; close the loop.
  Always produce these 4 scenes regardless of the paper's own structure.
- HARD LENGTH LIMIT: the narration across all 4 technical scenes combined must
  total NO MORE THAN 90 words. Each scene is 1-2 short punchy sentences, about
  18-24 words max. Be ruthless — cut every non-essential word. This is a strict
  cap (background is counted separately above).
- Produce a "coldOpen": a 2-4 WORD curiosity-gap teaser flashed on screen just
  after the title card (NOT spoken). Punchy and incomplete, e.g. "Doctors missed
  this." / "It shouldn't exist." / "Watch the third test." All-caps energy, no
  ending period needed.
- Also produce a short one-sentence "hook" tagline (used as a subtitle in the app UI).
- For each scene, also give a "subject": the 1-2 word concrete noun that scene is
  ABOUT (e.g. "brain", "tumor cell", "algorithm", "coral reef"). Tangible,
  depictable, lowercase.
- Ignore reference lists, funding statements, and acknowledgments.
- Be accurate. Do not invent findings not supported by the text. If the paper is only an abstract, summarize what's available and don't fabricate detail.
- For each scene, also pick the single best-fitting icon for its animated
  visual from EXACTLY this list (respond with the key only, lowercase,
  exactly as written): ${ICON_KEYS.join(", ")}.
- For each scene, also pick an illustrated backdrop "setting" that best
  matches what's happening in that beat, from EXACTLY this list (respond with
  the key only, lowercase, exactly as written): ${SETTING_KEYS.join(", ")}.
  Guidance: "lab-bench" for wet-lab/chemistry/biology experiments,
  "operating-room" for clinical/surgical/patient-care content, "office-coding"
  for software/algorithms/data-analysis work, "lecture-hall" for explaining a
  concept, theory, or teaching-style beat (also the safe default for an
  abstract idea), "server-room" for infrastructure/systems/large-scale
  compute, "field-research" for fieldwork, ecology, surveys, or real-world
  observation. Vary the settings across scenes where the content justifies it
  rather than picking the same one every time.
- For each scene, first extract a "keyTerms" list: 3-6 concrete terms that are
  ACTUALLY NAMED in the paper text for this beat — the real organism, cell type,
  molecule, technique, instrument, or anatomical structure (e.g. "CA1 pyramidal
  neuron", "two-photon microscopy", "GCaMP6 calcium indicator", "dendritic
  spine"). Copy spelling EXACTLY from the paper. Never invent or paraphrase into
  synonyms. These terms are drawn as correct on-screen labels in the video and
  also ground the illustrations.
- For each scene, write TWO image prompts — "imagePrompt" and "imagePromptB" —
  that are TWO DIFFERENT SHOTS of the same beat. Both MUST explicitly depict the
  scene's keyTerms as the literal visual subject (not metaphor-only) — e.g. if
  keyTerms include "dendritic spine" and "two-photon microscope", the image
  should show that spine and that instrument, not an unrelated generic brain.
  They hard-cut mid-scene, so they must also be visually distinct from each other
  to create a "new camera angle" jolt: change the framing (extreme close-up vs
  wide), the angle (overhead, worm's-eye, dramatic side light), or the moment
  (before vs after). Same subject and world, clearly different picture. Each is a
  concrete, vivid 1-2 sentence description for an AI image generator: subject,
  setting, key objects, action, mood.
- VISUAL NOVELTY: reach for arresting, scroll-stopping imagery viewers haven't
  seen — microscopic/cellular close-ups, dramatic scale contrasts, glowing
  structures in darkness, unexpected cinematic angles, a sense of motion. Keep the
  main subject in the upper two-thirds so there is room for a caption at the bottom.
- CRITICAL: never describe charts, graphs, plots, data readouts, diagrams with
  labels, screens showing data, equations, or anything that implies written
  text/numbers — image models render these as garbled misspelled gibberish. Depict
  findings symbolically and scenically (glowing vs dim, big vs small, appearing/
  vanishing) with NO lettering of any kind. On-screen words come from Remotion
  overlays using the paper's exact keyTerms, never from the image generator.
- PAPER FIGURES: you may receive a catalog of real figures extracted from the PDF.
  For each scene, optionally set "figureId" to one catalog id (e.g. "fig-1") when
  that figure genuinely supports the beat — prefer scene 2 (methods) and scene 3
  (results). Use each figureId at most once. If nothing fits, set figureId to null.
  Also set "figurePlacement": "inset" (framed over AI backdrop; default for charts)
  or "fullbleed" (figure fills the frame; for photos/microscopy). Never invent ids.

Output ONLY valid JSON (no markdown, no backticks, no commentary) in EXACTLY this shape:
{
  "paperTitle": string,
  "authors": string,
  "journal": string,
  "doi": string,
  "hook": string,
  "coldOpen": string,
  "background": string,
  "backgroundImagePrompt": string,
  "scenes": [
    { "index": number, "title": string, "narration": string, "subject": string, "visualCue": string, "icon": string, "setting": string, "keyTerms": string[], "imagePrompt": string, "imagePromptB": string, "figureId": string | null, "figurePlacement": "inset" | "fullbleed" }
  ]
}`;

/** Strip accidental markdown fences and parse JSON defensively. */
function parseScriptJson(text: string): {
  paperTitle: string;
  authors?: string;
  journal?: string;
  doi?: string;
  hook: string;
  coldOpen: string;
  background?: string;
  backgroundImagePrompt?: string;
  scenes: Scene[];
} {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.scenes)) {
    throw new Error("Model output missing scenes array");
  }
  return parsed;
}

export async function generateScript(
  paperText: string,
  figures: PaperFigure[] = [],
  figureAssetId?: string
): Promise<VideoScript> {
  const figureBlock =
    figures.length > 0
      ? `\n\nPAPER FIGURE CATALOG (assign with figureId when a scene needs the real figure):\n${formatFigureCatalog(figures)}\n`
      : "\n\nPAPER FIGURE CATALOG: none available. Set every scene's figureId to null.\n";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2800,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the paper text:\n\n${paperText}${figureBlock}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text returned from Claude");
  }

  const parsed = parseScriptJson(textBlock.text);
  const knownIds = new Set(figures.map((f) => f.id));
  const usedFigureIds = new Set<string>();

  // Enforce the fixed 4-act structure regardless of what the model returned.
  const scenes: Scene[] = parsed.scenes.slice(0, 4).map((s, i) => {
    const rawId = s.figureId ? String(s.figureId).trim() : null;
    const figureId =
      rawId && knownIds.has(rawId) && !usedFigureIds.has(rawId) ? rawId : null;
    if (figureId) usedFigureIds.add(figureId);

    const placementRaw = (s.figurePlacement ?? "inset").toString().toLowerCase();
    const figurePlacement: FigurePlacement =
      placementRaw === "fullbleed" ? "fullbleed" : "inset";

    return {
      index: i + 1,
      title: s.title ?? `Scene ${i + 1}`,
      narration: s.narration ?? "",
      visualCue: s.visualCue,
      icon: (ICON_KEYS as readonly string[]).includes(s.icon)
        ? s.icon
        : "file-text",
      setting: (SETTING_KEYS as readonly string[]).includes(s.setting)
        ? s.setting
        : "lecture-hall",
      imagePrompt: s.imagePrompt ?? s.visualCue ?? s.title ?? "",
      // Fall back to shot A if the model omitted a distinct second shot.
      imagePromptB: s.imagePromptB ?? s.imagePrompt ?? s.visualCue ?? s.title ?? "",
      subject: (s.subject ?? s.title ?? "").toString().toLowerCase().trim(),
      keyTerms: Array.isArray(s.keyTerms)
        ? s.keyTerms
            .filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
            .map((k) => k.trim())
            .slice(0, 6)
        : [],
      figureId,
      figurePlacement: figureId ? figurePlacement : undefined,
    };
  });

  const background = (parsed.background ?? "").toString().trim();
  const backgroundImagePrompt = (
    parsed.backgroundImagePrompt ??
    parsed.scenes?.[0]?.imagePrompt ??
    "A cinematic abstract science illustration suggesting the research field, no text"
  )
    .toString()
    .trim();

  const fullNarration = [background, ...scenes.map((s) => s.narration)]
    .filter(Boolean)
    .join(" ");

  return {
    paperTitle: parsed.paperTitle ?? "Untitled paper",
    authors: (parsed.authors ?? "").toString().trim(),
    journal: (parsed.journal ?? "").toString().trim(),
    doi: (parsed.doi ?? "").toString().trim(),
    hook: parsed.hook ?? "",
    coldOpen: (parsed.coldOpen ?? parsed.hook ?? "").toString().trim(),
    background,
    backgroundImagePrompt,
    scenes,
    fullNarration,
    figureAssetId,
    figures,
  };
}
