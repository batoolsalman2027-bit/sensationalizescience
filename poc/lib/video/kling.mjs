// Kling adapter — official Open Platform (single API key, text-to-video).
// Auth: Authorization: Bearer KLING_API_KEY.
// omni-video (kling-video-o1) supports text-only generation; mode std = economy.
import { sleep, downloadTo, brief } from "./common.mjs";

const HOST = "https://api-singapore.klingai.com/v1";
const MODEL = "kling-video-o1";
const EST_USD = 0.4; // rough per-clip std; reconciled against final_unit_deduction on run

export const kling = {
  id: "kling",
  label: "Kling O1",
  estimate({ seconds = 5 } = {}) {
    return { seconds, usd: EST_USD };
  },

  async generate({ prompt, seconds = 5, aspectRatio = "16:9", mode = "std", outPath, log = console.log }) {
    const key = process.env.KLING_API_KEY;
    if (!key) throw new Error("KLING_API_KEY missing");
    const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    // Text-only (no reference image) supports ONLY 5 or 10 second clips — snap to nearest.
    const dur = seconds >= 8 ? "10" : "5";

    const start = await fetch(`${HOST}/videos/omni-video`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model_name: MODEL,
        prompt,
        mode,
        aspect_ratio: aspectRatio,
        duration: dur,
      }),
    });
    const sj = await start.json();
    if (!start.ok || sj.code !== 0)
      throw new Error(`kling start ${start.status} code=${sj.code}: ${brief(sj)}`);
    const taskId = sj.data.task_id;
    log(`  kling task: ${taskId}`);

    for (let i = 0; i < 120; i++) {
      await sleep(10_000);
      const p = await fetch(`${HOST}/videos/omni-video/${taskId}`, { headers });
      const pj = await p.json();
      const st = pj.data?.task_status;
      if (st === "succeed") {
        const url = pj.data.task_result?.videos?.[0]?.url;
        if (!url) throw new Error(`kling succeed, no video: ${brief(pj)}`);
        const { bytes } = await downloadTo(url, outPath);
        return { outPath, bytes, deduction: pj.data.final_unit_deduction };
      }
      if (st === "failed") throw new Error(`kling failed: ${pj.data?.task_status_msg}`);
      log(`  kling ${st || "…"} (${i})…`);
    }
    throw new Error("kling timed out");
  },
};
