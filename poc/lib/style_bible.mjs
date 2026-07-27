// The shared visual style bible + global negative block. Injected into the
// storyboard generator so every scene reads as one coherent short documentary,
// and re-asserted at render time. This is a DOCUMENTARY, not a slideshow of
// isolated anatomy: shots are events, anatomy is always connected to a body,
// and change is animated on-screen.
export const STYLE_BIBLE = [
  "VISUAL STYLE (applies to every shot):",
  "- Cinematic scientific DOCUMENTARY in the spirit of Nature Video / TED-Ed — realistic and photoreal, NOT cartoon animation. Restrained, credible, precise.",
  "- Realistic HUMANS are welcome and encouraged where the story calls for them (patients, researchers, surgeons) — natural faces, natural motion, documentary lighting. They are a feature, not something to avoid.",
  "- Every shot is an EVENT, not a static object: something is happening, changing, or moving through space during the shot. Describe actions and change, never just a thing sitting there.",
  "- Anatomy is ALWAYS connected to a body and reached via motion (push through skin, fly through tissue, zoom across scales) — never a disconnected organ floating in a void.",
  "- Camera is active and motivated: tracking, dolly in/out, orbit, slow push, crane, macro, microscope view, cross-sectional reveal, volumetric fly-through. Motivated, smooth, cinematic — no aimless Ken Burns pan-over-a-still.",
  "- Aspect ratio 16:9. Lighting: soft, volumetric, motivated. Physically based materials; subsurface scattering on tissue; crisp micro-detail.",
  "- Palette: cool and clinical (deep blues, teals, clean whites) with ONE restrained accent — warm amber for vitality/recovery, deep red reserved strictly for pathology / oxidative stress.",
  "- NO on-screen text, letters, numbers, labels, arrows, captions, UI, or watermarks, ever. No brand logos.",
  "- Biologically and anatomically plausible; scale and structures consistent with real histology and cell biology.",
].join("\n");

// Standing negative block appended to (or expressed for) every scene. Targets
// the common AI-video failure modes the redesign is meant to eliminate.
export const GLOBAL_NEGATIVE =
  "floating or disconnected anatomy, organ in a void without a body, slideshow effect, " +
  "Ken Burns pan over a still image, static diagram, text overlays, numbers or labels on screen, " +
  "random unused lab equipment, cartoonish or low-detail CGI, duplicated subjects, extra or missing limbs, " +
  "distorted or melting faces, unnatural body proportions, awkward hand motion, jitter, morphing artifacts, flicker";

// Compact negative for models with no native negative field (Runway/Kling) —
// appended inline to the positive prompt, so it must stay short.
export const SHORT_NEGATIVE =
  "Avoid: floating or disconnected anatomy, slideshow or Ken Burns pan, on-screen text or numbers, " +
  "distorted faces, extra limbs, morphing, flicker, cartoon CGI.";

/** Render an entity sheet (from the paper brief) as prompt-ready guidance. */
export function entitySheetText(entities = []) {
  if (!entities.length) return "";
  return (
    "RECURRING SUBJECTS (keep visually consistent across shots):\n" +
    entities.map((e) => `- ${e.name}: ${e.visual}`).join("\n")
  );
}
