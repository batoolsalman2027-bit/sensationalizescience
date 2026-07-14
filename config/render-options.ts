/** User-selectable render options shown after script generation. */

export type AspectRatioId = "9:16" | "16:9" | "1:1";

export type AspectRatioOption = {
  id: AspectRatioId;
  label: string;
  hint: string;
  width: number;
  height: number;
};

export type VoiceOption = {
  id: string;
  label: string;
  description: string;
};

export const ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: "9:16",
    label: "Vertical",
    hint: "TikTok · Reels · Shorts",
    width: 1080,
    height: 1920,
  },
  {
    id: "16:9",
    label: "Landscape",
    hint: "YouTube · presentations",
    width: 1920,
    height: 1080,
  },
  {
    id: "1:1",
    label: "Square",
    hint: "Feed posts",
    width: 1080,
    height: 1080,
  },
];

/** Curated ElevenLabs voices. UI shows demographic labels only. */
export const VOICES: VoiceOption[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    label: "Female (American)",
    description: "",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    label: "Male (American)",
    description: "",
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    label: "Female (British)",
    description: "",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    label: "Male (British)",
    description: "",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    label: "Female (Australian)",
    description: "",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    label: "Male (Australian)",
    description: "",
  },
];

export type RenderOptions = {
  voiceId: string;
  aspectRatio: AspectRatioId;
};

export function defaultRenderOptions(): RenderOptions {
  const envVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  const voiceId =
    envVoice && VOICES.some((v) => v.id === envVoice)
      ? envVoice
      : VOICES[0].id;
  return { voiceId, aspectRatio: "9:16" };
}

export function resolveAspectRatio(id: AspectRatioId | string | undefined): AspectRatioOption {
  return ASPECT_RATIOS.find((a) => a.id === id) ?? ASPECT_RATIOS[0];
}

export function resolveVoiceId(voiceId: string | undefined): string {
  if (voiceId && VOICES.some((v) => v.id === voiceId)) return voiceId;
  return defaultRenderOptions().voiceId;
}

export function sanitizeRenderOptions(
  input?: Partial<RenderOptions> | null
): RenderOptions {
  const defaults = defaultRenderOptions();
  return {
    voiceId: resolveVoiceId(input?.voiceId ?? defaults.voiceId),
    aspectRatio: resolveAspectRatio(input?.aspectRatio).id,
  };
}
