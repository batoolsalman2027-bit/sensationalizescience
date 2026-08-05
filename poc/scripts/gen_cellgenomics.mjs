// One-off driver: generate the cellgenomics gallery video's cinematic shots on
// Kling, using the VERBATIM approved prompts in poc/out/shots.json (kind:video).
// Figures/title are handled outside the video providers. SPENDS on run.
import fs from "node:fs";
import path from "node:path";
import { kling } from "../lib/video/kling.mjs";

const OUT = "poc/out/clips";
fs.mkdirSync(OUT, { recursive: true });
const plan = JSON.parse(fs.readFileSync("poc/out/shots.json", "utf8"));
const vids = plan.shots.filter((s) => s.kind === "video");

console.log(`\n▶ Kling generation — ${vids.length} shots (verbatim prompts)\n`);
const manifest = [];
for (const s of vids) {
  const outPath = path.join(OUT, `${s.id}__kling.mp4`);
  if (fs.existsSync(outPath)) {
    console.log(`↺ ${s.id} — exists, skip`);
    manifest.push({ id: s.id, outPath, ok: true, skipped: true });
    continue;
  }
  const prompt = `${s.klingPrompt}\nAvoid: ${s.avoid}`;
  const t0 = Date.now();
  console.log(`● ${s.id} (${s.seconds}s) …`);
  try {
    const r = await kling.generate({ prompt, seconds: s.seconds, aspectRatio: "16:9", mode: "std", outPath });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  ✓ ${outPath} (${(r.bytes / 1e6).toFixed(2)} MB, ${secs}s, units ${r.deduction ?? "?"})`);
    manifest.push({ id: s.id, outPath, ok: true, deduction: r.deduction });
  } catch (e) {
    console.log(`  ✗ ${s.id}: ${e.message}`);
    manifest.push({ id: s.id, ok: false, error: e.message });
  }
  fs.writeFileSync(path.join(OUT, "manifest_cellgenomics.json"), JSON.stringify(manifest, null, 2));
}
const ok = manifest.filter((x) => x.ok).length;
const units = manifest.reduce((a, x) => a + (x.deduction || 0), 0);
console.log(`\n${ok}/${manifest.length} ok · total units ${units}\n`);
