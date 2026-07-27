/**
 * Stage 2 (redesigned): turn the paper brief into a SHORT DOCUMENTARY storyboard.
 *
 * We do NOT generate video prompts straight from the paper. We generate a
 * purposeful storyboard first — a narrative with a beginning, middle, and end —
 * where every scene is an EVENT with a reason to exist, human context comes
 * before anatomy, pathology is animated, methods show people doing things, and
 * results are driven by the figures. Each scene carries narration AND a
 * cinematographer-grade video prompt written to avoid the slideshow/floating-
 * anatomy failure modes.
 *
 * Out: poc/out/storyboard.json
 * Usage: node --env-file=.env poc/scripts/build_storyboard.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { STYLE_BIBLE, GLOBAL_NEGATIVE, entitySheetText } from "../lib/style_bible.mjs";

const MODEL = process.env.STORYBOARD_MODEL ?? "claude-sonnet-4-5-20250929";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const brief = JSON.parse(await readFile("poc/out/paper-brief.json", "utf8"));

const prompt = `You are the director of a short scientific DOCUMENTARY about one research paper, for scientists and publishers. Think Nature Video / TED-Ed: realistic, cinematic, story-first — NOT a slideshow of AI images. You will output a STORYBOARD.

=== PAPER BRIEF (your ground truth) ===
${JSON.stringify(brief, null, 2)}

=== ${STYLE_BIBLE} ===

=== ${entitySheetText(brief.entities)} ===

CORE PHILOSOPHY — do not ask "what image should I generate?" Ask "what story am I telling?" Every shot must answer: who is on screen, what are they doing, what is CHANGING during the shot, what is the camera doing, why does this shot exist, and how does it connect to the shots before and after. Describe EVENTS, not objects.

NARRATIVE ARC (keep this flow; scene count can vary):
1. HOOK — open on a REAL HUMAN experiencing the problem (chronic lower-back pain: e.g. an older adult or worker halted by back pain, hand to the lower spine). Establish human stakes BEFORE any anatomy.
2. Transition INTO the body — the camera pushes through skin/back into the lumbar spine. Never cut to floating anatomy.
3. BIOLOGY / PATHOLOGY — a healthy intervertebral disc ANIMATES into degeneration (dehydrates, loses height, fissures); then zoom to the cellular scale where ferroptosis unfolds (iron accumulation, lipid peroxidation rippling across membranes, cells failing). Animate the change; don't show a static disc.
4. LIMITATION — show why current care is insufficient (symptoms managed but degeneration continues despite treatment).
5. METHODS — show PEOPLE DOING THINGS: researchers culturing BMSCs, encapsulating them in the injectable hydrogel; then HONEST rat microsurgery injecting the hydrogel into the caudal disc. This is a RAT-MODEL study — depict animal research realistically and respectfully; do NOT imply human treatment here.
6. RESULTS — driven by the figures. Include exactly ONE scene with "renderMode":"chart" representing the accurate recreated Figure 3 (this scene is composited from a real data chart elsewhere, so its videoPrompt may be a brief placeholder and WON'T be sent to a video model). Around it, animate the biological MEANING of the findings (cells surviving, GPX4 restored, lipid peroxidation fading, the STAT3 signaling dimming and the rescue reversed by the agonist). State significance in the narration where the data is significant.
7. HUMAN IMPACT — return to a human moving freely again, but frame it UNMISTAKABLY as the FUTURE GOAL this preclinical work points toward (narration must make clear this is the aspiration, not a demonstrated human outcome).
8. SIGNIFICANCE — pull back: ferroptosis as a therapeutic target, cell + biomaterial combination therapy, translational future.

HARD CONSTRAINTS:
- TOTAL length 60-90 seconds. Narration ~3 words/sec, so keep TOTAL narration to about 190-260 words. Be concise; one tight sentence per scene. Aim for ~12-15 scenes.
- Each scene runs 4-8 seconds ("durationS").
- "videoPrompt": cinematographer's shot direction — environment, subject(s) and what they DO, the change across the shot, the specific CAMERA MOVEMENT, the TRANSITION into the shot, lighting, motion, style. It MUST read like directions for a cinematographer, describe an event, and be 820 CHARACTERS OR FEWER (hard cap; if it won't fit, tighten — do not exceed). For the "chart" scene, videoPrompt can be a one-line placeholder.
- "transitionIn": how the camera gets from the previous scene to this one (e.g. "push through the patient's skin into the lumbar spine", "microscopic zoom into tissue", "match-cut from lab dish to rat OR").
- "negativePrompt": scene-specific things to avoid (beyond the global list already enforced).
- Never put text/numbers on screen. Never show floating anatomy without a body/context.

Return STRICT JSON ONLY (no markdown fence):
{
  "title": "${brief.title}",
  "targetSeconds": 75,
  "scenes": [
    {
      "n": 1,
      "act": "hook",
      "purpose": "why this shot exists (one line)",
      "narration": "the spoken words for this scene",
      "visualGoal": "what the viewer should understand or feel",
      "transitionIn": "how we arrive from the previous scene (for scene 1: how we open)",
      "onScreen": "who / what is on screen",
      "videoPrompt": "cinematographer shot direction, an EVENT, <=820 chars",
      "negativePrompt": "scene-specific negatives",
      "durationS": 6,
      "renderMode": "video"
    }
  ]
}`;

console.error(`[storyboard] model=${MODEL}`);
const res = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 16000,
  messages: [{ role: "user", content: prompt }],
});

let text = res.content.find((c) => c.type === "text")?.text ?? "";
text = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

let board;
try {
  board = JSON.parse(text);
} catch (e) {
  console.error("[storyboard] JSON parse failed. Raw:\n", text.slice(0, 2000));
  process.exit(1);
}

// Inject the global negative from the style bible (source of truth, not model-authored).
board.globalNegative = GLOBAL_NEGATIVE;

let over = 0;
for (const s of board.scenes)
  if (s.renderMode !== "chart" && (s.videoPrompt || "").length > 900) {
    over++;
    console.error(`[storyboard] WARN scene ${s.n} videoPrompt ${s.videoPrompt.length} chars (>900)`);
  }

await writeFile("poc/out/storyboard.json", JSON.stringify(board, null, 2));
console.error(`[storyboard] wrote poc/out/storyboard.json | in=${res.usage.input_tokens} out=${res.usage.output_tokens} | over900=${over}`);

let words = 0, vid = 0, chart = 0;
for (const s of board.scenes) {
  words += (s.narration || "").split(/\s+/).length;
  s.renderMode === "chart" ? chart++ : vid++;
  console.log(`  ${String(s.n).padStart(2)}. [${(s.act || "").padEnd(12)}] ${s.renderMode === "chart" ? "CHART " : "video "}${s.durationS}s · ${(s.purpose || "").slice(0, 60)}`);
}
console.log(`\n  ${board.scenes.length} scenes (${vid} video + ${chart} chart) · ${words} narration words (~${(words / 3).toFixed(0)}s @3wps)`);
