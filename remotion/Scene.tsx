import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ICONS } from "./icons";
import { SETTINGS } from "./scenes";
import { IllustratedScene } from "./IllustratedScene";
import { WordTiming } from "./Captions";
import { theme } from "./theme";

export interface SceneProps {
  title: string;
  narration: string;
  icon: string;
  /** Short subject noun for this beat; labels the talking mascot. */
  subject?: string;
  /** AI-generated illustration path (shot A). Preferred visual when present. */
  imageStaticPath?: string;
  /** Second illustration (shot B) for a mid-scene hard-cut. */
  imageStaticPathB?: string;
  /** Illustrated scene backdrop key (see remotion/scenes). Fallback when no image. Omit for the plain intro-card layout. */
  setting?: string;
  /** Per-word narration timing for synced captions. */
  captions?: WordTiming[];
  /** Small top-right label, e.g. "2 / 6". Omit to hide (used for the intro card). */
  badge?: string;
  /** Ken Burns direction seed for the illustrated layout. */
  motionSeed?: number;
}

/** One scene's animated visual: an AI illustration (preferred), a code-drawn setting, or a plain icon card. */
export function Scene({
  title,
  narration,
  icon,
  subject,
  imageStaticPath,
  imageStaticPathB,
  setting,
  captions,
  badge,
  motionSeed,
}: SceneProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (imageStaticPath) {
    return (
      <IllustratedScene
        imageStaticPath={imageStaticPath}
        imageStaticPathB={imageStaticPathB}
        title={title}
        subject={subject}
        icon={icon}
        narration={narration}
        captions={captions}
        badge={badge}
        motionSeed={motionSeed}
      />
    );
  }

  const Icon = ICONS[icon] ?? ICONS["file-text"];

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const iconOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [8, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 24], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const captionOpacity = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOutStart = durationInFrames - 15;
  const exitOpacity = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const SettingScene = setting ? SETTINGS[setting] : undefined;

  if (SettingScene) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: theme.bg,
          fontFamily: theme.fontFamily,
          color: theme.text,
          opacity: exitOpacity,
        }}
      >
        {badge && (
          <div
            style={{
              position: "absolute",
              top: 28,
              right: 40,
              color: theme.muted,
              fontSize: 20,
              letterSpacing: 1,
              zIndex: 2,
            }}
          >
            {badge}
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, opacity: iconOpacity }}>
          <SettingScene />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "28px 64px 40px",
            background: `linear-gradient(180deg, transparent, ${theme.bg} 55%)`,
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontSize: 40,
              fontWeight: 700,
              textAlign: "center",
              letterSpacing: -0.4,
              marginBottom: 12,
            }}
          >
            {title}
          </div>
          <div
            style={{
              opacity: captionOpacity,
              fontSize: 24,
              color: theme.muted,
              textAlign: "center",
              maxWidth: 980,
              lineHeight: 1.4,
              margin: "0 auto",
            }}
          >
            {narration}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        backgroundImage: `radial-gradient(circle at 50% 32%, ${theme.panel} 0%, ${theme.bg} 65%)`,
        fontFamily: theme.fontFamily,
        color: theme.text,
        opacity: exitOpacity,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 56,
            color: theme.muted,
            fontSize: 22,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      )}

      <div
        style={{
          opacity: iconOpacity,
          transform: `scale(${iconScale})`,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: theme.panel,
          border: `2px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 48,
        }}
      >
        <Icon color={theme.accent} size={84} strokeWidth={1.75} />
      </div>

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 52,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: 900,
          letterSpacing: -0.5,
          marginBottom: 28,
        }}
      >
        {title}
      </div>

      <div
        style={{
          opacity: captionOpacity,
          fontSize: 28,
          color: theme.muted,
          textAlign: "center",
          maxWidth: 820,
          lineHeight: 1.4,
        }}
      >
        {narration}
      </div>
    </AbsoluteFill>
  );
}
