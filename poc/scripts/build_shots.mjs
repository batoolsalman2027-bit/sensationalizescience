/**
 * ShotPlanner (spec §8.1): emit a validated Shot[] from the paper brief.
 *
 * The LLM never writes prompt strings — it writes structured Shot objects that
 * obey the spec's rules (verb rule, concrete referent, no-text, entity budget,
 * scale floor). We then classify + route (video vs chart vs diagram vs PDB),
 * validate, and write poc/out/shots.json with a report.
 *
 * Usage: node --env-file=.env poc/scripts/build_shots.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { routeShots, classifyContent, formatKling, formatRunway, ABSTRACTION_MAP, DIAGRAM_ONLY } from "../lib/shot.mjs";

const MODEL = process.env.STORYBOARD_MODEL ?? "claude-sonnet-4-5-20250929";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const brief = JSON.parse(await readFile("poc/out/paper-brief.json", "utf8"));

const diagramOnly = Object.keys(ABSTRACTION_MAP).filter((k) => ABSTRACTION_MAP[k] === DIAGRAM_ONLY);
const referents = Object.entries(ABSTRACTION_MAP)
  .filter(([, v]) => v !== DIAGRAM_ONLY)
  .map(([k, v]) => `- ${k} -> ${v}`)
  .join("\n");

const prompt = `You are ShotPlanner for a scientific documentary. Output a STRUCTURED Shot[] — never freeform prompt strings. Ground everything in the brief.

=== PAPER BRIEF ===
${JSON.stringify(brief, null, 2)}

RULES (a shot that breaks these is rejected):
1. VERB RULE: every shot's "action" describes something that visibly CHANGES across the clip and contains a present-participle verb (…-ing). Camera motion alone is not enough.
2. CONCRETE REFERENT: "subject" is ONE physical, filmable noun phrase (max 2 physical entities). Translate abstractions using this map:
${referents}
3. SCALE FLOOR: generative video is reliable only down to CELL scale. Anything molecular (protein conformational change, phosphorylation, signaling causation) is NOT a video shot. For those, emit a shot with "scale":"molecular" and "render":"diagram" and a short "narration" — it will be routed to a diagram, not a provider. These concepts are diagram-only: ${diagramOnly.join(", ")}.
4. NO TEXT: never describe labels, text, numbers, charts, axes, screens, or UI in subject/action/setting.
5. RESULTS = DATA: the paper's quantitative results are NOT generative video. Emit EXACTLY TWO chart shots, each "render":"chart" with a "figure" id: one "fig3" (in-vitro ferroptosis marker panels) and one "fig2" (in-vivo MRI grade + histological score). AROUND them add cell-scale "consequence" VIDEO shots showing the phenomenon as REAL phase-contrast microscopy (medium:"microscopy") — e.g. cells dividing and filling the substrate vs. cells rounding up and detaching. The STAT3 signaling mechanism is a molecular CAUSAL claim: emit it as ONE "render":"diagram" shot ("scale":"molecular") — it becomes a node-edge pathway diagram, never video. Do NOT emit generic "glowing molecule/particle" video — that is the blob failure we are eliminating.
6. ONE camera move per shot (enum). ONE idea per shot.

Narrative arc: motivation (human with the problem -> into the body -> pathology failing) -> method (people doing the work; honest rat model) -> results (chart + cell-scale consequences + mechanism-as-diagram) -> significance (reverse the zoom; the same human, recovered — future-framed since this is a RAT model). ~12-16 shots.

Enums: scale = world|person|body|organ|tissue|cell|molecular. camera = locked|push-in|pull-out|orbit-left|orbit-right|tilt-up|tilt-down|track-follow|rack-focus|crane-down. medium = live-action|medical-3d|microscopy|surgical-pov|macro-benchtop|volumetric-data. framing = wide|medium|close|macro. section = motivation|method|results|significance. durationSec = 5 or 10.

Return STRICT JSON ONLY:
{
  "shots": [
    {
      "id": "m1", "section": "motivation", "beat": 1,
      "scale": "person", "subject": "…one concrete noun phrase…", "action": "…present-participle change…",
      "camera": "locked", "framing": "medium", "setting": "…where + lighting…", "medium": "live-action",
      "narration": "spoken line for this shot",
      "negative": ["shot-specific negatives"],
      "durationSec": 5,
      "render": "video",            // or "chart" (results figure) or "diagram" (molecular)
      "figure": null,               // "fig3" or "fig2" when render is "chart"
      "continuityRef": null,        // id of a shot whose subject must match (e.g. significance -> motivation beat 1)
      "firstFrameFrom": null        // id of prior shot to chain from (Runway I2V)
    }
  ]
}`;

console.error(`[shots] model=${MODEL}`);
const res = await anthropic.messages.create({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content: prompt }] });
let text = (res.content.find((c) => c.type === "text")?.text ?? "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

let plan;
try { plan = JSON.parse(text); } catch (e) { console.error("[shots] JSON parse failed:\n", text.slice(0, 1500)); process.exit(1); }
const shots = plan.shots;

// classify + route
const routed = routeShots(shots);

await writeFile("poc/out/shots.json", JSON.stringify({ shots, routing: { video: routed.video.map((s) => s.id), chart: routed.chart.map((s) => s.id), diagram: routed.diagram.map((s) => s.id), structure: routed.structure.map((s) => s.id) } }, null, 2));

console.log(`\n=== ${shots.length} shots · in=${res.usage.input_tokens} out=${res.usage.output_tokens} ===`);
for (const s of shots) {
  const c = classifyContent(s);
  console.log(`  ${s.id.padEnd(4)} [${(s.section || "").padEnd(12)}] ${String(s.scale).padEnd(9)} → ${c}`);
}
console.log(`\nrouting: ${routed.video.length} video · ${routed.chart.length} chart · ${routed.diagram.length} diagram · ${routed.structure.length} pdb\n`);

// preview two formatted provider prompts for the first video shot
const first = routed.video[0];
if (first) {
  console.log("── sample Kling format (" + first.id + ") ──\n" + formatKling(first).prompt + "\n");
  console.log("── sample Runway format (" + first.id + ") ──\n" + JSON.stringify(formatRunway(first)) + "\n");
}
