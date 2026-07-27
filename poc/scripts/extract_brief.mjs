/**
 * Stage 1 of the narration pipeline: read the paper (+ digitized figure data)
 * and produce a structured brief that grounds the storyboard.
 *
 * Out: poc/out/paper-brief.json  — title/author/journal, an entity sheet for
 * visual consistency, per-section summaries, and per-figure result significance
 * (including what the p-values mean, so Results narration can state it).
 *
 * Usage: node --env-file=.env poc/scripts/extract_brief.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.STORYBOARD_MODEL ?? "claude-sonnet-4-5-20250929";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const paper = await readFile("poc/out/paper.txt", "utf8");
const digitized = JSON.parse(await readFile("poc/out/fig3-digitized.json", "utf8"));

const prompt = `You are a scientific editor preparing a publication-quality summary video of a research paper, for an audience of scientists and journal publishers (NOT social media). Read the paper text and the digitized figure data, then produce a grounding brief.

=== PAPER TEXT (may include OCR noise) ===
${paper.slice(0, 48000)}

=== DIGITIZED FIGURE 3 DATA (recovered bar values + significance brackets; source of truth for results) ===
${JSON.stringify(digitized).slice(0, 6000)}

Return STRICT JSON ONLY (no markdown fence), matching this schema:
{
  "title": "exact paper title",
  "firstAuthor": "first-listed author's full name",
  "correspondingAuthor": "corresponding author if identifiable, else null",
  "journal": "journal name",
  "year": "publication year if present, else null",
  "entities": [
    { "name": "short label", "visual": "a concrete, filmable visual description of this subject for consistent depiction across shots" }
  ],
  "sections": {
    "cover": "1-2 sentence framing of what the paper is about",
    "intro": "3-5 sentences: the problem (IVDD, back pain), why ferroptosis/oxidative stress matters, and the therapeutic idea — pitched at a scientific level",
    "methods": "3-5 sentences summarizing the actual techniques used (models, assays, delivery)",
    "results": "4-6 sentences on the key findings, grounded in the figure data",
    "discussion": "3-5 sentences: significance, broader impact on the IVDD/regenerative field, and future directions"
  },
  "resultsSignificance": [
    { "finding": "plain-language statement of one key result", "evidence": "which panel(s)/comparison supports it", "significant": true, "pMeaning": "what the p-value bracket indicates in plain terms" }
  ]
}

Requirements:
- entities: include at least the intervertebral disc, BMSCs, the matrix hydrogel carrier, nucleus pulposus cells, and ferroptosis / oxidative-stress markers (e.g. GPX4, SLC7A11, ACSL4, lipid peroxidation). Give each a filmable "visual".
- resultsSignificance: for any comparison with a p-value bracket in the digitized data, state that significance WAS found and explain it in plain terms.
- Be accurate. Do not invent numbers; rely on the digitized data for quantitative claims.`;

console.error(`[brief] model=${MODEL}`);
const res = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 4000,
  messages: [{ role: "user", content: prompt }],
});

let text = res.content.find((c) => c.type === "text")?.text ?? "";
text = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

let brief;
try {
  brief = JSON.parse(text);
} catch (e) {
  console.error("[brief] JSON parse failed. Raw:\n", text);
  process.exit(1);
}

await writeFile("poc/out/paper-brief.json", JSON.stringify(brief, null, 2));
console.error(`[brief] wrote poc/out/paper-brief.json | in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
console.log(`\n${brief.title}\n${brief.firstAuthor} et al. · ${brief.journal} ${brief.year ?? ""}`);
console.log(`entities: ${brief.entities.map((e) => e.name).join(", ")}`);
console.log(`resultsSignificance: ${brief.resultsSignificance.length} findings`);
