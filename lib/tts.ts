/**
 * Required stage: the sole source of narration audio for the rendered
 * video. Called once per scene (plus the hook) by lib/render.ts.
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Generate at natural speed with clean word timestamps; the final speed-up
// (beyond ElevenLabs' 1.2 ceiling) is applied via ffmpeg in lib/audio.ts.
const NARRATION_SPEED = Number(process.env.ELEVENLABS_SPEED ?? "1.0");

export async function synthesizeElevenLabs(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  }

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: NARRATION_SPEED },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export interface WordTiming {
  word: string;
  /** Seconds from the start of this clip. */
  start: number;
  end: number;
}

export interface TimedSpeech {
  buffer: Buffer;
  words: WordTiming[];
}

/**
 * Same TTS call, but via the /with-timestamps endpoint so we get character-level
 * alignment — which we fold into word-level timings to drive synced ("karaoke")
 * captions. Falls back to an empty word list if alignment is missing.
 */
export async function synthesizeWithTimestamps(text: string): Promise<TimedSpeech> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  }

  const res = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: NARRATION_SPEED },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    audio_base64: string;
    alignment?: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  };

  const buffer = Buffer.from(json.audio_base64, "base64");
  return { buffer, words: charsToWords(json.alignment) };
}

/** Group character-level alignment into whitespace-delimited words. */
function charsToWords(alignment?: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): WordTiming[] {
  if (!alignment) return [];
  const { characters, character_start_times_seconds, character_end_times_seconds } =
    alignment;
  const words: WordTiming[] = [];
  let current = "";
  let start = 0;
  let end = 0;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (current) {
        words.push({ word: current, start, end });
        current = "";
      }
      continue;
    }
    if (!current) start = character_start_times_seconds[i];
    current += ch;
    end = character_end_times_seconds[i];
  }
  if (current) words.push({ word: current, start, end });
  return words;
}
