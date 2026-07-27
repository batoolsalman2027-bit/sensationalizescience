// Render the Shot plan (poc/out/shots.json) across the video models.
//
// Uses the spec's routing: classifyContent() decides destination and only
// video-class shots (human-scale / organ-tissue / cellular) reach a provider.
// chart -> recreated figure layer (Manim), diagram -> Route A (pending),
// structural -> Route B PDB (pending): those are reported, not generated here.
// Prompts are built by the §5 formatters (formatKling / formatRunway).
//
// SAFE BY DEFAULT: prints the plan + cost and calls NOTHING. --go to spend.
//   node --env-file=.env poc/scripts/gen_clips.mjs                  # dry run
//   node --env-file=.env poc/scripts/gen_clips.mjs --go --models kling
import fs from "node:fs";
import path from "node:path";
import { veo } from "../lib/video/veo.mjs";
import { runway } from "../lib/video/runway.mjs";
import { kling } from "../lib/video/kling.mjs";
import { routeShots, classifyContent, formatKling, formatRunway } from "../lib/shot.mjs";

const OUT = "poc/out/clips";
const ADAPTERS = { veo, runway, kling };
const CAP = { runway: 1000, kling: 2500, veo: 1000 };
const clamp = (t, max) => (t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, ""));

const plan = JSON.parse(fs.readFileSync("poc/out/shots.json", "utf8"));
const routed = routeShots(plan.shots);

// Per-model prompt assembly. Kling: full cinematography string + the negative
// folded in (omni has no separate negative field we rely on). Runway I2V would
// take motion-only + a first frame — not wired yet, so fall back to a T2V string.
function buildPrompt(model, shot) {
  if (model === "kling") {
    const k = formatKling(shot);
    return { prompt: clamp(`${k.prompt}\nAvoid: ${k.negative_prompt}`, CAP.kling), seconds: shot.durationSec };
  }
  if (model === "veo") {
    const k = formatKling(shot);
    return { prompt: clamp(k.prompt, CAP.veo), negativePrompt: k.negative_prompt, seconds: shot.durationSec };
  }
  // runway T2V fallback (I2V/frame-chaining is step 2, needs a first-frame model)
  const k = formatKling(shot);
  return { prompt: clamp(`${k.prompt}\n${formatRunway(shot).promptText}`, CAP.runway), seconds: shot.durationSec };
}

const args = process.argv.slice(2);
const GO = args.includes("--go");
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const models = flag("--models", "kling").split(",").map((s) => s.trim()).filter((m) => ADAPTERS[m]);
const limit = Number(flag("--limit", "0"));
let vids = routed.video;
if (limit > 0) vids = vids.slice(0, limit);

console.log(`\n${GO ? "▶ LIVE RUN — WILL SPEND" : "◇ DRY RUN — no paid calls"}`);
console.log(`shots.json: ${plan.shots.length} total → ${routed.video.length} video · ${routed.chart.length} chart(figure layer) · ${routed.diagram.length} diagram(Route A) · ${routed.structure.length} pdb(Route B)`);
console.log(`rendering ${vids.length} video shot(s) on: ${models.join(", ")}\n`);
let total = 0;
for (const m of models) { const per = ADAPTERS[m].estimate({}).usd; total += per * vids.length; console.log(`  ${ADAPTERS[m].label.padEnd(16)} ~$${per} × ${vids.length} = $${(per * vids.length).toFixed(2)}`); }
console.log(`  estimated total: ~$${total.toFixed(2)}\n`);

if (!GO) {
  for (const s of vids) console.log(`  [${s.id}] ${classifyContent(s)} ${s.durationSec}s · ${(s.subject || "")} — ${(s.action || "").slice(0, 50)}…`);
  if (routed.chart.length) console.log(`\n  chart→figure layer: ${routed.chart.map((s) => s.id).join(", ")}`);
  if (routed.diagram.length) console.log(`  diagram→Route A (pending): ${routed.diagram.map((s) => s.id).join(", ")}`);
  console.log("\nDry run only. Re-run with --go to generate.\n");
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
for (const s of vids) {
  for (const m of models) {
    const outPath = path.join(OUT, `${s.id}__${m}.mp4`);
    if (fs.existsSync(outPath)) { console.log(`↺ ${s.id} × ${m} — exists`); manifest.push({ id: s.id, model: m, outPath, ok: true, skipped: true }); continue; }
    const t0 = Date.now();
    process.stdout.write(`\n● ${s.id} × ${m}\n`);
    try {
      const r = await ADAPTERS[m].generate({ ...buildPrompt(m, s), outPath });
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ✓ ${outPath} (${(r.bytes / 1e6).toFixed(2)} MB, ${secs}s${r.deduction ? `, units ${r.deduction}` : ""})`);
      manifest.push({ id: s.id, model: m, outPath, ok: true, deduction: r.deduction });
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
      manifest.push({ id: s.id, model: m, ok: false, error: e.message });
    }
    fs.writeFileSync(path.join(OUT, "manifest_shots.json"), JSON.stringify(manifest, null, 2));
  }
}
console.log(`\n${manifest.filter((x) => x.ok).length}/${manifest.length} ok\n`);
