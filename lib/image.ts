/**
 * Gemini Flash Image ("nano banana") scene-illustration generation.
 *
 * We keep a single locked STYLE_PROMPT so every scene in a video shares one
 * cohesive look, and support passing a previously-generated image as a style
 * reference (Gemini is strong at matching a reference), so scene 2..N stay
 * visually consistent with scene 1 — the thing that makes it feel like one film.
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

/** Locked art direction applied to every scene for a cohesive look. */
export const STYLE_PROMPT = `Flat modern editorial vector illustration, clean geometric shapes, soft cinematic lighting, subtle grain, limited cohesive palette of deep navy background with teal and sky-blue accents and warm highlights. Tall vertical 9:16 portrait composition, full-bleed, the main subject centered in the upper-middle with clear negative space in the lower third for captions. ABSOLUTELY NO text, letters, numbers, words, labels, captions, charts with axis labels, graphs, logos, or watermarks anywhere in the image — depict ideas purely through imagery, shapes, and color. Sophisticated science-communication aesthetic, the visual language of a high-end explainer video.`;

export interface GeneratedImage {
  buffer: Buffer;
  /** base64 of the PNG, handy for passing back as a style reference. */
  base64: string;
  mimeType: string;
}

/**
 * Generate one scene illustration. Throws on API/quota errors so the caller
 * can decide whether to fall back to the code-drawn scene.
 */
export async function generateSceneImage(
  sceneDescription: string,
  referenceBase64?: string
): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const parts: unknown[] = [
    { text: `${STYLE_PROMPT}\n\nScene to illustrate: ${sceneDescription}` },
  ];
  if (referenceBase64) {
    // Give the model the first scene's image so it matches the established style.
    parts.unshift({
      inlineData: { mimeType: "image/png", data: referenceBase64 },
    });
    parts.push({
      text: "Match the exact art style, palette, and character design of the reference image above.",
    });
  }

  const call = (withAspect: boolean) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            // Ask for vertical 9:16 when the model supports it; older image
            // models ignore/reject imageConfig, so we retry without it below.
            ...(withAspect ? { imageConfig: { aspectRatio: "9:16" } } : {}),
          },
        }),
      }
    );

  let res = await call(true);
  if (!res.ok) {
    // Retry without the aspect-ratio hint in case this model rejects the field.
    res = await call(false);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini image error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    candidates?: {
      content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
    }[];
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  );
  const data = imagePart?.inlineData?.data;
  if (!data) {
    throw new Error("Gemini returned no image data");
  }

  return {
    buffer: Buffer.from(data, "base64"),
    base64: data,
    mimeType: imagePart?.inlineData?.mimeType ?? "image/png",
  };
}
