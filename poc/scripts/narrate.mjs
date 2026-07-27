// Synthesize scene-by-scene narration from the storyboard via ElevenLabs.
//
// One mp3 per narrated scene (poc/out/audio/sNN.mp3) so each line can be synced
// to its shot in the composite. SAFE BY DEFAULT: dry run prints the script +
// character count (ElevenLabs bills per character); --go actually synthesizes.
//
//   node --env-file=.env poc/scripts/narrate.mjs         # dry run
//   node --env-file=.env poc/scripts/narrate.mjs --go    # synthesize
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const VOICE = process.env.ELEVENLABS_VOICE_ID;
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
const SPEED = Number(process.env.NARRATION_SPEED ?? "1.08"); // slightly brisk, per direction

const board = JSON.parse(await readFile("poc/out/storyboard.json", "utf8"));
const scenes = board.scenes.filter((s) => (s.narration || "").trim());
const totalChars = scenes.reduce((a, s) => a + s.narration.length, 0);

const GO = process.argv.includes("--go");
console.log(`\n${GO ? "▶ LIVE — synthesizing" : "◇ DRY RUN — no synthesis"}`);
console.log(`scenes: ${scenes.length} narrated · ${totalChars} characters · voice=${VOICE ? "set" : "MISSING"} · model=${MODEL} · speed=${SPEED}\n`);

if (!GO) {
  for (const s of scenes) console.log(`  s${String(s.n).padStart(2, "0")} [${s.act}] (${s.narration.length}c) ${s.narration.slice(0, 66)}…`);
  console.log(`\nElevenLabs bills per character → ${totalChars} chars total. Dry run only; --go to synthesize.\n`);
  process.exit(0);
}

if (!VOICE || !KEY) throw new Error("ELEVENLABS_VOICE_ID or ELEVENLABS_API_KEY missing");
await mkdir("poc/out/audio", { recursive: true });

for (const s of scenes) {
  const out = path.join("poc/out/audio", `s${String(s.n).padStart(2, "0")}.mp3`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: s.narration,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, speed: SPEED },
    }),
  });
  if (!res.ok) {
    console.log(`  ✗ s${s.n}: ${res.status} ${(await res.text()).slice(0, 220)}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  console.log(`  ✓ ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log("\ndone.\n");
