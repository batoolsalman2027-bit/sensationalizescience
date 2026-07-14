import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

export interface ColdOpenProps {
  text: string;
  /** Global composition frame when this teaser should appear. */
  startFrame?: number;
  /** How long the card stays before whipping away. */
  durationInFrames?: number;
}

/**
 * A 2-4 word curiosity-gap teaser that hard-cuts on screen for ~0.6s after the
 * title card, then whips away — the pattern-interrupt hook that stops the
 * scroll before the narration lands. Rendered as an overlay so first spoken
 * audio can start underneath.
 */
export function ColdOpen({
  text,
  startFrame = 0,
  durationInFrames = 18,
}: ColdOpenProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  if (!text || local < 0 || local > durationInFrames) return null;

  // Snap in big, then whip up-and-out.
  const pop = spring({
    frame: local,
    fps,
    config: { damping: 9, mass: 0.5 },
    durationInFrames: 8,
  });
  const scale = interpolate(pop, [0, 1], [1.6, 1]);
  const exit = interpolate(local, [durationInFrames - 5, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(exit, [0, 1], [0, -140]);
  const opacity = interpolate(exit, [0, 1], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6,10,14,0.82)",
        opacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px) scale(${scale})`,
          fontFamily: theme.fontFamily,
          color: "#ffffff",
          fontSize: 108,
          fontWeight: 900,
          lineHeight: 1.02,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: -1.5,
          padding: "0 56px",
          textShadow: "0 6px 30px rgba(0,0,0,0.8)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
