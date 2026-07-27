// Runway adapter — official REST API (true text-to-video).
// Auth: Authorization: Bearer RUNWAY_API_KEY + X-Runway-Version header.
// Runway's own text-to-video model is gen4.5 (the list also exposes veo/seedance).
import { sleep, downloadTo, brief } from "./common.mjs";

const HOST = "https://api.dev.runwayml.com/v1";
const VERSION = "2024-11-06";
const MODEL = "gen4.5";
const RATE_USD_PER_S = 0.08; // approx; confirmed against the dashboard on first run

export const runway = {
  id: "runway",
  label: "Runway Gen-4.5",
  estimate({ seconds = 5 } = {}) {
    return { seconds, usd: +(RATE_USD_PER_S * seconds).toFixed(2) };
  },

  // ratio 1280:720 == 16:9. duration must be an integer 2..10.
  async generate({ prompt, seconds = 5, ratio = "1280:720", outPath, log = console.log }) {
    const key = process.env.RUNWAY_API_KEY;
    if (!key) throw new Error("RUNWAY_API_KEY missing");
    const headers = {
      Authorization: `Bearer ${key}`,
      "X-Runway-Version": VERSION,
      "Content-Type": "application/json",
    };

    const start = await fetch(`${HOST}/text_to_video`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: MODEL, promptText: prompt, ratio, duration: seconds }),
    });
    const sj = await start.json();
    if (!start.ok) throw new Error(`runway start ${start.status}: ${brief(sj)}`);
    const id = sj.id;
    log(`  runway task: ${id}`);

    for (let i = 0; i < 120; i++) {
      await sleep(6_000);
      const p = await fetch(`${HOST}/tasks/${id}`, { headers });
      const pj = await p.json();
      const st = pj.status;
      if (st === "SUCCEEDED") {
        const url = pj.output?.[0];
        if (!url) throw new Error(`runway succeeded, no output: ${brief(pj)}`);
        const { bytes } = await downloadTo(url, outPath);
        return { outPath, bytes };
      }
      if (st === "FAILED") throw new Error(`runway failed: ${brief(pj)}`);
      log(`  runway ${st || "…"} (${i})…`);
    }
    throw new Error("runway timed out");
  },
};
