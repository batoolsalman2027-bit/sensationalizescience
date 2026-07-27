// Step 1 of the video-prompt spec: the Shot schema, content classifier,
// validator (incl. the scale floor), and the router that keeps molecular /
// quantitative / structural content OUT of the video providers.
//
// Pure, no LLM, no I/O — fully unit-testable. The storyboard generator emits
// Shot objects; validateShots() rejects malformed ones; classifyContent()/
// routeShots() decide video vs. Remotion/diagram/PDB/chart BEFORE any provider
// is chosen. formatKling()/formatRunway() turn a validated video Shot into a
// provider request string.

// ---- enums ----
export const SCALES = ["world", "person", "body", "organ", "tissue", "cell", "molecular"];
export const CAMERA = [
  "locked", "push-in", "pull-out", "orbit-left", "orbit-right",
  "tilt-up", "tilt-down", "track-follow", "rack-focus", "crane-down",
];
export const MEDIUM = ["live-action", "medical-3d", "microscopy", "surgical-pov", "macro-benchtop", "volumetric-data"];
export const SECTIONS = ["motivation", "method", "results", "significance"];
export const FRAMING = ["wide", "medium", "close", "macro"];

// ---- §2.2 abstraction map: abstraction -> filmable referent, or DIAGRAM_ONLY ----
export const DIAGRAM_ONLY = "DIAGRAM_ONLY";
export const ABSTRACTION_MAP = {
  inflammation: "reddened swollen tissue, dilated capillaries, fluid pooling at the margin",
  "disc degeneration": "a flattened brown-tinged disc, cracked fibrous outer ring, reduced height between vertebrae",
  fibrosis: "pale rigid collagen strands replacing soft tissue, tissue stiffening and contracting",
  "drug delivery": "a viscous translucent gel spreading outward through tissue",
  "cell proliferation": "cells under phase contrast dividing and filling the empty substrate",
  "mechanical loading": "tissue compressing under a descending platen, then rebounding",
  "machine learning model": "a volumetric point cloud resolving into a coherent anatomical surface",
  ferroptosis: "a cell membrane rippling and blistering as it breaks down, the cell rounding up",
  "oxidative stress": "tissue darkening and cells shrinking under damage",
  // below the scale floor / causal relations -> never a video prompt
  "gene expression": DIAGRAM_ONLY,
  "statistical significance": DIAGRAM_ONLY,
  "stat3 activation": DIAGRAM_ONLY,
  phosphorylation: DIAGRAM_ONLY,
  "pathway inhibition": DIAGRAM_ONLY,
  "receptor binding": DIAGRAM_ONLY,
  "ligand docking": DIAGRAM_ONLY,
  "cytokine signaling": DIAGRAM_ONLY,
  transcription: DIAGRAM_ONLY,
  "nuclear translocation": DIAGRAM_ONLY,
};

// words that indicate an attempt to render text (§2.3) — rejected in subject/action/setting
export const NO_TEXT_WORDS = ["label", "text", "graph", "chart", "axis", "axes", "number", "caption", "title", "ui", "screen", "readout", "diagram"];

// terms that mean an abstraction slipped into a concrete field (§2.2 blocklist)
export const ABSTRACTION_BLOCKLIST = Object.keys(ABSTRACTION_MAP).filter((k) => ABSTRACTION_MAP[k] === DIAGRAM_ONLY);

// ---- §4.1 style bible + §4.4 negatives (spec-canonical) ----
export const STYLE_BIBLE =
  "cinematic documentary, shallow depth of field, soft directional key light, " +
  "desaturated cool palette with warm skin tones, 35mm, subtle film grain, no glowing effects, no lens flare";
export const NEGATIVE_BASE = [
  "text", "letters", "numbers", "labels", "captions", "watermark", "logo",
  "graphs", "charts", "axes", "user interface", "screens",
  "extra fingers", "deformed hands", "distorted anatomy",
  "glowing particles", "neon", "sci-fi hologram", "lens flare",
  "camera shake", "rapid cuts", "morphing", "warping",
];

const MEDIUM_PHRASE = {
  "live-action": "cinematic documentary footage",
  "medical-3d": "clinical anatomical render",
  microscopy: "phase contrast microscopy footage",
  "surgical-pov": "surgical macro footage",
  "macro-benchtop": "macro benchtop laboratory footage",
  "volumetric-data": "volumetric data visualization",
};
const CAMERA_PHRASE_KLING = {
  locked: "locked-off camera",
  "push-in": "the camera slowly pushes in",
  "pull-out": "the camera slowly pulls back",
  "orbit-left": "slow orbit to the left around the subject",
  "orbit-right": "slow orbit to the right around the subject",
  "tilt-up": "the camera slowly tilts up",
  "tilt-down": "the camera slowly tilts down",
  "track-follow": "the camera tracks alongside the moving subject",
  "rack-focus": "locked-off camera, focus shifting from foreground to background",
  "crane-down": "a slow crane move downward",
};
const CAMERA_PHRASE_RUNWAY = {
  locked: "Locked-off camera, steady frame",
  "push-in": "Slow push in toward the subject",
  "pull-out": "Slow pull back from the subject",
  "orbit-left": "Slow orbit to the left",
  "orbit-right": "Slow orbit to the right",
  "tilt-up": "Slow tilt up",
  "tilt-down": "Slow tilt down",
  "track-follow": "The camera tracks alongside the subject",
  "rack-focus": "Locked-off camera, focus shifts front to back",
  "crane-down": "Slow crane downward",
};

// ---- §3.5 content classification ----
/** @returns {'human-scale'|'organ-tissue'|'cellular'|'molecular'|'structural'|'quantitative'} */
export function classifyContent(shot) {
  if (shot.render === "chart" || shot.render === "data" || shot.contentClass === "quantitative") return "quantitative";
  if (shot.render === "structure" || shot.contentClass === "structural") return "structural";
  if (shot.scale === "molecular") return "molecular";
  if (shot.scale === "cell") return "cellular";
  if (shot.scale === "organ" || shot.scale === "tissue") return "organ-tissue";
  return "human-scale"; // world / person / body
}

/** Split shots by destination. Video classes go to providers; the rest bypass to Remotion/PDB. */
export function routeShots(shots) {
  const out = { video: [], diagram: [], chart: [], structure: [] };
  for (const s of shots) {
    const c = classifyContent(s);
    if (c === "quantitative") out.chart.push(s);
    else if (c === "molecular") out.diagram.push(s);
    else if (c === "structural") out.structure.push(s);
    else out.video.push(s);
  }
  return out;
}

// ---- §5 provider formatters ----
export function formatKling(shot, style = STYLE_BIBLE) {
  return {
    prompt: [MEDIUM_PHRASE[shot.medium], shot.subject, shot.action, CAMERA_PHRASE_KLING[shot.camera], shot.setting, style]
      .filter(Boolean).join(", "),
    negative_prompt: [...NEGATIVE_BASE, ...(shot.negative || [])].join(", "),
    duration: shot.durationSec,
    cfg_scale: 0.5,
  };
}

// Runway is image-to-video: describe MOTION ONLY (§5.2). promptImage resolved by caller.
export function formatRunway(shot) {
  return {
    promptText: `${CAMERA_PHRASE_RUNWAY[shot.camera]}. ${shot.action}.`,
    ratio: "1280:768",
    duration: shot.durationSec,
  };
}
