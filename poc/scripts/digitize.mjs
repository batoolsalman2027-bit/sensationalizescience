/**
 * PoC: AI-assisted chart digitization (WebPlotDigitizer-style).
 *
 * Feeds a figure image to Claude vision and recovers the underlying numeric
 * values for each bar, reading the y-axis scale from the gridlines/ticks.
 * Outputs strict JSON with a per-value confidence so the QC step can flag
 * low-confidence estimates. Numbers here are ESTIMATES, not quoted — the
 * whole point of the accuracy report is to measure how good they are.
 *
 * Usage: node --env-file=.env poc/scripts/digitize.mjs <image> <panelsJson> <out>
 */
import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const [imagePath, panelsSpecPath, outPath] = process.argv.slice(2);
if (!imagePath || !panelsSpecPath || !outPath) {
  console.error("usage: digitize.mjs <image.png> <panels.json> <out.json>");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.DIGITIZE_MODEL ?? "claude-sonnet-4-5-20250929";

const spec = JSON.parse(await readFile(panelsSpecPath, "utf8"));
const imgB64 = (await readFile(imagePath)).toString("base64");

const prompt = `You are a meticulous scientific chart digitizer, equivalent to WebPlotDigitizer but driven by vision.

The attached image is a multi-panel figure from a research paper. I will name the panels to read and their known axis titles / group labels (these are factual, read directly from the figure). Your job is to recover the NUMERIC VALUE each bar encodes.

Method you MUST follow for every panel:
1. Locate the y-axis. Read the numbered tick labels and note the axis minimum and maximum and the value between adjacent gridlines. NOTE: some axes do NOT start at zero (e.g. a GSH axis may start at 15) — read the actual bottom tick, do not assume 0.
2. For each bar, find the pixel height of the bar top relative to the tick gridlines, and linearly interpolate to the axis scale to estimate the bar's mean value.
3. If an error bar (whisker) is visible, estimate its half-length in the same axis units.
4. Give a confidence 0-1 for each mean: 1.0 = value sits exactly on a labeled gridline; lower it when the top falls between gridlines, the axis is compressed, or the bar is partly occluded by data dots.
5. Read the significance brackets drawn ABOVE the bars. Each bracket spans two bars and carries a p-value label (e.g. "P<0.001", "P<0.01", "NS"). Record which two groups (0-based left-to-right index) each bracket connects and its exact label text.

Panels to read (id → axis title, unit, group labels in left-to-right order):
${JSON.stringify(spec.panels, null, 2)}

Return STRICT JSON ONLY (no markdown fence), matching:
{
  "figure": "${spec.figure}",
  "panels": [
    {
      "id": "A",
      "yAxis": { "title": "...", "unit": "...", "min": 0, "max": 150, "perGridline": 50 },
      "groups": [ { "label": "...", "mean": 0.0, "errorHalf": 0.0, "confidence": 0.0 } ],
      "significance": [ { "between": [0, 1], "label": "P<0.001" } ],
      "readingNotes": "which gridlines you interpolated between"
    }
  ]
}`;

console.error(`[digitize] model=${MODEL} image=${imagePath}`);
const res = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 4000,
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: imgB64 } },
        { type: "text", text: prompt },
      ],
    },
  ],
});

let text = res.content.find((c) => c.type === "text")?.text ?? "";
text = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

let parsed;
try {
  parsed = JSON.parse(text);
} catch (e) {
  console.error("[digitize] failed to parse JSON. Raw output:\n", text);
  process.exit(1);
}

await writeFile(outPath, JSON.stringify(parsed, null, 2));
console.error(`[digitize] wrote ${outPath} | input tokens=${res.usage.input_tokens} output tokens=${res.usage.output_tokens}`);

// Print a compact human-readable summary to stdout.
for (const p of parsed.panels) {
  console.log(`\nPanel ${p.id}: ${p.yAxis.title} (${p.yAxis.unit}) [axis ${p.yAxis.min}-${p.yAxis.max}]`);
  for (const g of p.groups) {
    console.log(`  ${g.label.padEnd(18)} = ${String(g.mean).padStart(7)} ± ${g.errorHalf ?? 0}   conf ${g.confidence}`);
  }
}
