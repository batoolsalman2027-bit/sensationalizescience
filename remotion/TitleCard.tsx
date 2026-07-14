import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useFrameOrientation } from "./layout";
import { theme } from "./theme";

export type TitleCardProps = {
  paperTitle: string;
  authors?: string;
  journal?: string;
  doi?: string;
};

/**
 * Silent citation card for the first ~2s: title, authors, journal / DOI.
 * Remotion draws all text so we never bake spelling into AI images.
 */
export function TitleCard({ paperTitle, authors, journal, doi }: TitleCardProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const orientation = useFrameOrientation();
  const isLandscape = orientation === "landscape";

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [18, 0]);

  const meta = [journal, doi].filter(Boolean).join("  ·  ");
  const titleSize =
    paperTitle.length > 90
      ? isLandscape
        ? 36
        : 42
      : paperTitle.length > 60
        ? isLandscape
          ? 42
          : 48
        : isLandscape
          ? 48
          : 56;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        backgroundImage: `radial-gradient(ellipse at 50% 28%, ${theme.panel} 0%, ${theme.bg} 68%)`,
        fontFamily: theme.fontFamily,
        color: theme.text,
        opacity,
        alignItems: "center",
        justifyContent: "center",
        padding: isLandscape ? "48px 120px" : "80px 72px",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          maxWidth: isLandscape ? 1500 : 920,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#5eead4",
            fontSize: isLandscape ? 18 : 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: isLandscape ? 18 : 28,
          }}
        >
          Research brief
        </div>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: -0.8,
            lineHeight: 1.15,
            marginBottom: isLandscape ? 18 : 28,
          }}
        >
          {paperTitle}
        </div>
        {authors ? (
          <div
            style={{
              fontSize: isLandscape ? 24 : 28,
              color: theme.muted,
              lineHeight: 1.35,
              marginBottom: 18,
            }}
          >
            {authors}
          </div>
        ) : null}
        {meta ? (
          <div
            style={{
              fontSize: isLandscape ? 20 : 24,
              color: "rgba(148,163,184,0.95)",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
