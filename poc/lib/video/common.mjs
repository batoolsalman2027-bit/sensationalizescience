// Shared helpers for the video adapters.
import fs from "node:fs";
import path from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Download a URL to disk. `headers` is only needed for auth'd URLs (Veo). */
export async function downloadTo(url, dest, headers = {}) {
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`download ${res.status} ${res.statusText} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return { dest, bytes: buf.length };
}

/** Truncate a possibly-huge JSON blob for error messages. */
export const brief = (o) => JSON.stringify(o).slice(0, 600);
