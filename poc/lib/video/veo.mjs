// Veo 3.1 Fast adapter — Google Gemini API (text-to-video, long-running op).
// Auth: x-goog-api-key = GEMINI_API_KEY.  Economy: $0.15/s @ 720p.
import { sleep, downloadTo, brief } from "./common.mjs";

const HOST = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "veo-3.1-fast-generate-preview";
const RATE_USD_PER_S = 0.15; // 720p Fast

export const veo = {
  id: "veo",
  label: "Veo 3.1 Fast",
  // Veo 3 family emits fixed ~8s clips; duration isn't a request knob here.
  estimate({ seconds = 8 } = {}) {
    return { seconds, usd: +(RATE_USD_PER_S * seconds).toFixed(2) };
  },

  async generate({ prompt, negativePrompt, aspectRatio = "16:9", outPath, log = console.log }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");

    const parameters = { aspectRatio, resolution: "720p" };
    if (negativePrompt) parameters.negativePrompt = negativePrompt; // Veo supports a native negative

    const start = await fetch(`${HOST}/models/${MODEL}:predictLongRunning`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt }], parameters }),
    });
    const sj = await start.json();
    if (!start.ok) throw new Error(`veo start ${start.status}: ${brief(sj)}`);
    const op = sj.name;
    log(`  veo op: ${op}`);

    for (let i = 0; i < 120; i++) {
      await sleep(10_000);
      const p = await fetch(`${HOST}/${op}`, { headers: { "x-goog-api-key": key } });
      const pj = await p.json();
      if (pj.error) throw new Error(`veo op error: ${brief(pj.error)}`);
      if (pj.done) {
        const uri =
          pj.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) throw new Error(`veo done, no video uri: ${brief(pj)}`);
        const { bytes } = await downloadTo(uri, outPath, { "x-goog-api-key": key });
        return { outPath, bytes };
      }
      log(`  veo polling (${i})…`);
    }
    throw new Error("veo timed out");
  },
};
