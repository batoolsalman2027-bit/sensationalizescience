import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, WordTiming } from "./Captions";
import { useFrameOrientation } from "./layout";
import { theme } from "./theme";

export interface IllustratedSceneProps {
  /** AI backdrop or null when showing a full-bleed paper figure alone. */
  imageStaticPath?: string;
  /** Second shot for a mid-scene hard-cut. Falls back to shot A when absent. */
  imageStaticPathB?: string;
  /** Real paper figure raster path (e.g. figures/fig-1.png). */
  figureStaticPath?: string;
  figurePlacement?: "inset" | "fullbleed";
  figureCaption?: string;
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
 * Vertical 9:16 TikTok-style scene with optional real paper figure overlays.
 */
export function IllustratedScene({
  imageStaticPath,
  imageStaticPathB,
  figureStaticPath,
  figurePlacement = "inset",
  figureCaption,
  title,
  keyTerms = [],
  narration,
  captions,
  badge,
  motionSeed = 0,
}: IllustratedSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const orientation = useFrameOrientation();
  const isLandscape = orientation === "landscape";
  const isSquare = orientation === "square";

  const hasAi = Boolean(imageStaticPath);
  const hasFigure = Boolean(figureStaticPath);
  const fullbleedFigure = hasFigure && figurePlacement === "fullbleed";

  const half = Math.floor(durationInFrames * 0.5);
  const hasCut =
    hasAi && !!imageStaticPathB && imageStaticPathB !== imageStaticPath;
  const inSecondHalf = hasCut && frame >= half;
  const activeImage = inSecondHalf
    ? (imageStaticPathB as string)
    : imageStaticPath;

  // Mild or no Ken Burns when a real figure is on screen (charts shouldn't zoom).
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const useKenBurns = hasAi && !hasFigure;
  const scale = useKenBurns ? interpolate(progress, [0, 1], [1.12, 1.24]) : 1;
  const dir = motionSeed % 4;
  const panX = useKenBurns
    ? interpolate(progress, [0, 1], [0, dir === 0 ? -50 : dir === 2 ? 50 : 0])
    : 0;
  const panY = useKenBurns
    ? interpolate(progress, [0, 1], [0, dir === 1 ? -45 : dir === 3 ? 45 : -25])
    : 0;

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
  const figureOpacity = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labels = hasFigure ? [] : keyTerms.slice(0, 4);
  const shortCaption = figureCaption
    ? figureCaption.length > 90
      ? `${figureCaption.slice(0, 87)}…`
      : figureCaption
    : null;

  const titleTop = isLandscape ? 36 : isSquare ? 48 : 90;
  const badgeTop = isLandscape ? 40 : isSquare ? 52 : 96;
  const labelsTop = isLandscape ? 96 : isSquare ? 120 : 200;
  const captionBottom = isLandscape ? 48 : isSquare ? 90 : 200;
  const figureTop = fullbleedFigure
    ? isLandscape
      ? 88
      : isSquare
        ? 120
        : 200
    : isLandscape
      ? 100
      : isSquare
        ? 140
        : 250;
  const figureBottom = fullbleedFigure
    ? isLandscape
      ? 140
      : isSquare
        ? 200
        : 360
    : isLandscape
      ? 160
      : isSquare
        ? 240
        : 460;
  const figureSide = isLandscape ? 80 : 56;
  const titleSize = isLandscape ? 28 : 34;
  const captionPadX = isLandscape ? 80 : 56;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        fontFamily: theme.fontFamily,
        color: theme.text,
        opacity: Math.min(enter, exit),
      }}
    >
      {hasAi && activeImage ? (
        <AbsoluteFill
          style={{
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            // Dim AI backdrop slightly under an inset figure for readability.
            filter: hasFigure && !fullbleedFigure ? "brightness(0.55) blur(1px)" : undefined,
          }}
        >
          <Img
            key={activeImage}
            src={staticFile(activeImage)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}

      {/* legibility scrims */}
      <AbsoluteFill
        style={{
          background: fullbleedFigure
            ? "linear-gradient(180deg, rgba(9,12,16,0.7) 0%, rgba(9,12,16,0.25) 28%, rgba(9,12,16,0.25) 55%, rgba(9,12,16,0.92) 100%)"
            : "linear-gradient(180deg, rgba(9,12,16,0.55) 0%, transparent 22%, transparent 50%, rgba(9,12,16,0.9) 100%)",
        }}
      />

      {/* topic label */}
      <div
        style={{
          position: "absolute",
          top: titleTop,
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
            fontSize: titleSize,
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
            top: badgeTop,
            right: isLandscape ? 56 : 40,
            color: "rgba(255,255,255,0.85)",
            fontSize: isLandscape ? 24 : 30,
            fontWeight: 600,
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          {badge}
        </div>
      )}

      {/* AI remake of paper figure */}
      {hasFigure && figureStaticPath && (
        <div
          style={{
            position: "absolute",
            left: figureSide,
            right: figureSide,
            top: figureTop,
            bottom: figureBottom,
            opacity: figureOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: isLandscape ? 18 : 28,
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.22)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile(figureStaticPath)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 14,
              color: "rgba(226,232,240,0.9)",
              fontSize: isLandscape ? 18 : 22,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            AI remake
          </div>
          {shortCaption ? (
            <div
              style={{
                marginTop: 8,
                color: "rgba(148,163,184,0.95)",
                fontSize: isLandscape ? 18 : 22,
                textAlign: "center",
                lineHeight: 1.3,
                maxWidth: isLandscape ? 1400 : 900,
                padding: "0 12px",
              }}
            >
              {shortCaption}
            </div>
          ) : null}
        </div>
      )}

      {/* Correct-spelling paper terms (hidden when a figure is already filling the mid frame) */}
      {labels.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: labelsTop,
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
                fontSize: isLandscape ? 22 : 26,
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

      {/* karaoke captions in the lower third */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: captionBottom,
          display: "flex",
          justifyContent: "center",
          padding: `0 ${captionPadX}px`,
        }}
      >
        {captions && captions.length > 0 ? (
          <Captions words={captions} />
        ) : (
          <div
            style={{
              fontSize: isLandscape ? 40 : 52,
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
