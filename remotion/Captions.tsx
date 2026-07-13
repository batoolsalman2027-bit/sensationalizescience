import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type WordTiming = { word: string; start: number; end: number };

interface CaptionsProps {
  words: WordTiming[];
  /** Words shown together per on-screen phrase. */
  chunkSize?: number;
}

/**
 * TikTok-style karaoke captions: a few big bold words on screen at a time,
 * swapping in sync with the narration, the currently-spoken word highlighted.
 */
export function Captions({ words, chunkSize = 4 }: CaptionsProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (!words || words.length === 0) return null;

  // Group words into fixed-size phrase chunks with a combined time span.
  const chunks: { words: WordTiming[]; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize);
    chunks.push({
      words: group,
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }

  // Active chunk = the one whose span contains t (or the last one before t).
  let active = chunks.findIndex((c) => t >= c.start && t <= c.end);
  if (active === -1) {
    active = chunks.filter((c) => c.start <= t).length - 1;
  }
  if (active < 0) active = 0;
  const chunk = chunks[active];

  // Pop-in when a new chunk appears.
  const pop = interpolate(t, [chunk.start, chunk.start + 0.14], [0.86, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "12px 18px",
        transform: `scale(${pop})`,
        maxWidth: 900,
      }}
    >
      {chunk.words.map((w, i) => {
        const spoken = t >= w.start;
        const isCurrent = t >= w.start && t <= w.end;
        return (
          <span
            key={i}
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              color: isCurrent ? "#2dd4bf" : spoken ? "#ffffff" : "rgba(255,255,255,0.55)",
              transform: isCurrent ? "scale(1.08)" : "scale(1)",
              textShadow: "0 3px 14px rgba(0,0,0,0.65)",
              transition: "none",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}
