// Narrate rbm20-camk2d shots → poc/out/rbm20-camk2d/audio/<id>.mp3
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const VOICE = process.env.ELEVENLABS_VOICE_ID;
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
const SPEED = Number(process.env.NARRATION_SPEED ?? "1.08");
const BASE = "poc/out/rbm20-camk2d";

const plan = JSON.parse(await readFile(`${BASE}/shots.json`, "utf8"));
const shots = plan.shots.filter((s) => (s.narration || "").trim());
const totalChars = shots.reduce((a, s) => a + s.narration.length, 0);

const GO = process.argv.includes("--go");
console.log(`${GO ? "▶ LIVE" : "◇ DRY"} · ${shots.length} narrated shots · ${totalChars} chars · voice=${VOICE ? "set" : "MISSING"}`);
if (!GO) { for (const s of shots) console.log(`  ${s.id}: ${s.narration.slice(0, 66)}…`); process.exit(0); }

await mkdir(`${BASE}/audio`, { recursive: true });
for (const s of shots) {
  const out = path.join(`${BASE}/audio`, `${s.id}.mp3`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: s.narration, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED } }),
  });
  if (!res.ok) { console.log(`  ✗ ${s.id}: ${res.status} ${(await res.text()).slice(0, 160)}`); continue; }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓ ${out}`);
}
