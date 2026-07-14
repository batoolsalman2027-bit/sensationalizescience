import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, WordTiming } from "./Captions";
import { theme } from "./theme";

export interface IllustratedSceneProps {
  imageStaticPath: string;
  /** Second shot for a mid-scene hard-cut. Falls back to shot A when absent. */
  imageStaticPathB?: string;
  title: string;
  /** Exact paper terms drawn as Remotion labels (correct spelling). */
  keyTerms?: string[];
  narration: string;
  captions?: WordTiming[];
  badge?: string;
  /** Varies the Ken Burns direction so consecutive scenes don't move identically. */
  motionSeed?: number;
}

/**
 * Vertical 9:16 TikTok-style scene:
 *  - two AI shots that swap at the midpoint (a clean "new picture" cut),
 *  - a slow, continuous Ken Burns move (no resets, no jolts),
 *  - Remotion overlays for paper keyTerms (never baked into the AI image),
 *  - karaoke captions in the lower third.
 */
export function IllustratedScene({
  imageStaticPath,
  imageStaticPathB,
  title,
  keyTerms = [],
  narration,
  captions,
  badge,
  motionSeed = 0,
}: IllustratedSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Two shots that swap at the midpoint. The zoom/pan below runs continuously
  // across the WHOLE scene, so the swap is a clean change of picture with no
  // jump in the camera move — only the image changes, not the motion.
  const half = Math.floor(durationInFrames * 0.5);
  const hasCut = !!imageStaticPathB && imageStaticPathB !== imageStaticPath;
  const inSecondHalf = hasCut && frame >= half;
  const activeImage = inSecondHalf ? (imageStaticPathB as string) : imageStaticPath;

  // Slow, continuous Ken Burns over the full scene (no per-half reset, no jolts).
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(progress, [0, 1], [1.12, 1.24]);
  const dir = motionSeed % 4;
  const panX = interpolate(progress, [0, 1], [0, dir === 0 ? -50 : dir === 2 ? 50 : 0]);
  const panY = interpolate(progress, [0, 1], [0, dir === 1 ? -45 : dir === 3 ? 45 : -25]);

  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleOpacity = interpolate(frame, [4, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelsOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labels = keyTerms.slice(0, 4);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        fontFamily: theme.fontFamily,
        color: theme.text,
        opacity: Math.min(enter, exit),
      }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
        }}
      >
        <Img
          key={activeImage}
          src={staticFile(activeImage)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* legibility scrims: darken top and bottom */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(9,12,16,0.55) 0%, transparent 22%, transparent 50%, rgba(9,12,16,0.9) 100%)",
        }}
      />

      {/* topic label */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "rgba(45,212,191,0.18)",
            border: "2px solid rgba(45,212,191,0.5)",
            color: "#5eead4",
            fontSize: 34,
            fontWeight: 700,
            padding: "10px 26px",
            borderRadius: 999,
            letterSpacing: 0.3,
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </span>
      </div>

      {badge && (
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 40,
            color: "rgba(255,255,255,0.85)",
            fontSize: 30,
            fontWeight: 600,
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          {badge}
        </div>
      )}

      {/* Correct-spelling paper terms as Remotion overlays (not AI-baked text) */}
      {labels.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: 200,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            opacity: labelsOpacity,
          }}
        >
          {labels.map((term) => (
            <span
              key={term}
              style={{
                background: "rgba(15,23,42,0.72)",
                border: "1px solid rgba(148,163,184,0.45)",
                color: "#e2e8f0",
                fontSize: 26,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 12,
                letterSpacing: 0.2,
                textShadow: "0 1px 6px rgba(0,0,0,0.55)",
                maxWidth: "100%",
              }}
            >
              {term}
            </span>
          ))}
        </div>
      )}

      {/* karaoke captions in the lower third (falls back to static narration) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 200,
          display: "flex",
          justifyContent: "center",
          padding: "0 56px",
        }}
      >
        {captions && captions.length > 0 ? (
          <Captions words={captions} />
        ) : (
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.2,
              textShadow: "0 3px 14px rgba(0,0,0,0.65)",
            }}
          >
            {narration}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
