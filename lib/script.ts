import Anthropic from "@anthropic-ai/sdk";
import type { VideoScript, Scene } from "./types";

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
const SYSTEM_PROMPT = `You are a viral science-TikTok scriptwriter who turns academic papers into short, addictive narrated vertical videos for a general-but-curious audience (think PhD/med students scrolling their feed).

You will receive the extracted text of a research paper. Produce a script for a SHORT vertical explainer video that MUST stay under 60 seconds — aim for roughly 45-55 seconds of narration.

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
- Produce EXACTLY 4 scenes, no more and no fewer, one per standard section of a
  scientific paper, in this exact order:
    1. Introduction & the problem — open the curiosity gap, set up the stakes.
    2. Methods — what the researchers actually did / how they studied it, in plain terms.
    3. Results — what they found; the key finding(s). Start delivering the payoff.
    4. Bigger impact — why it matters, the implications, what comes next; close the loop.
  Always produce these 4 scenes regardless of the paper's own structure.
- HARD LENGTH LIMIT: the narration across all 4 scenes combined must total NO
  MORE THAN 105 words. Each scene is 1-2 short punchy sentences, about 22-26
  words max. Be ruthless — cut every non-essential word, keep one idea per
  sentence. This is a strict cap, not a target to fill. Going over makes the
  video exceed its 60-second limit, which is unacceptable.
- Produce a "coldOpen": a 2-4 WORD curiosity-gap teaser flashed on screen in the
  first half-second (NOT spoken). Punchy and incomplete, e.g. "Doctors missed
  this." / "It shouldn't exist." / "Watch the third test." All-caps energy, no
  ending period needed.
- Also produce a short one-sentence "hook" tagline (used as a subtitle in the app UI).
- For each scene, also give a "subject": the 1-2 word concrete noun that scene is
  ABOUT (e.g. "brain", "tumor cell", "algorithm", "coral reef"). This labels an
  on-screen mascot, so make it a tangible, depictable thing, lowercase.
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
  spine"). These must come from the paper, never invented or generic. This is
  what keeps the illustrations grounded in the actual science instead of drifting
  into generic stock-art imagery.
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
  labels, screens showing data, or anything that implies written text/numbers —
  image models render these as garbled misspelled text. Instead depict findings
  symbolically and scenically (e.g. glowing vs. dim structures, big vs. small
  shapes, objects appearing/vanishing) with NO lettering of any kind.

Output ONLY valid JSON (no markdown, no backticks, no commentary) in EXACTLY this shape:
{
  "paperTitle": string,
  "hook": string,
  "coldOpen": string,
  "scenes": [
    { "index": number, "title": string, "narration": string, "subject": string, "visualCue": string, "icon": string, "setting": string, "keyTerms": string[], "imagePrompt": string, "imagePromptB": string }
  ]
}`;

/** Strip accidental markdown fences and parse JSON defensively. */
function parseScriptJson(text: string): {
  paperTitle: string;
  hook: string;
  coldOpen: string;
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

export async function generateScript(paperText: string): Promise<VideoScript> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the paper text:\n\n${paperText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text returned from Claude");
  }

  const parsed = parseScriptJson(textBlock.text);

  // Enforce the fixed 4-act structure regardless of what the model returned.
  const scenes: Scene[] = parsed.scenes.slice(0, 4).map((s, i) => ({
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
      ? s.keyTerms.filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
      : [],
  }));

  const fullNarration = [parsed.hook, ...scenes.map((s) => s.narration)]
    .filter(Boolean)
    .join(" ");

  return {
    paperTitle: parsed.paperTitle ?? "Untitled paper",
    hook: parsed.hook ?? "",
    coldOpen: (parsed.coldOpen ?? parsed.hook ?? "").toString().trim(),
    scenes,
    fullNarration,
  };
}
