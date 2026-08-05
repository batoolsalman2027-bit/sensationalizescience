// Kling driver for the praxis gallery video — verbatim approved prompts.
// Reads poc/out/praxis/shots.json (kind:video) → poc/out/praxis/clips/. SPENDS.
import fs from "node:fs";
import path from "node:path";
import { kling } from "../lib/video/kling.mjs";

const BASE = "poc/out/praxis";
const OUT = `${BASE}/clips`;
fs.mkdirSync(OUT, { recursive: true });
const plan = JSON.parse(fs.readFileSync(`${BASE}/shots.json`, "utf8"));
const vids = plan.shots.filter((s) => s.kind === "video");

console.log(`\n▶ Kling — ${vids.length} praxis shots\n`);
const manifest = [];
for (const s of vids) {
  const outPath = path.join(OUT, `${s.id}__kling.mp4`);
  if (fs.existsSync(outPath)) { console.log(`↺ ${s.id} exists`); manifest.push({ id: s.id, ok: true, skipped: true }); continue; }
  const prompt = `${s.klingPrompt}\nAvoid: ${s.avoid}`;
  const t0 = Date.now();
  console.log(`● ${s.id} (${s.seconds}s) …`);
  try {
    const r = await kling.generate({ prompt, seconds: s.seconds, aspectRatio: "16:9", mode: "std", outPath });
    console.log(`  ✓ ${outPath} (${(r.bytes / 1e6).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s, units ${r.deduction ?? "?"})`);
    manifest.push({ id: s.id, ok: true, deduction: r.deduction });
  } catch (e) {
    console.log(`  ✗ ${s.id}: ${e.message}`);
    manifest.push({ id: s.id, ok: false, error: e.message });
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
}
console.log(`\n${manifest.filter((x) => x.ok).length}/${manifest.length} ok · total units ${manifest.reduce((a, x) => a + (Number(x.deduction) || 0), 0)}\n`);
