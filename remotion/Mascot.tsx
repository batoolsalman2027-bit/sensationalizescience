import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WordTiming } from "./Captions";

export interface MascotProps {
  /** Per-word narration timings (seconds) used to drive the mouth open/close. */
  captions?: WordTiming[];
  /** Accent color for the collar. */
  accent?: string;
  /** Varies blink/glance phase so consecutive scenes' mascots don't move in lockstep. */
  seed?: number;
}

/**
 * A friendly cartoon scientist — lab coat, glasses — who sits in the reserved
 * center zone and appears to narrate: the mouth opens during each spoken word
 * and closes in the gaps (driven by real word timings, so it lip-syncs the
 * audio). Narration itself stays third-person; the mascot is a presenter, not
 * a character in the story.
 */
export function Mascot({ captions, accent = "#2dd4bf", seed = 0 }: MascotProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Bouncy entrance each scene (frame resets per Series.Sequence).
  const enter = spring({ frame, fps, config: { damping: 11, mass: 0.7 }, durationInFrames: 20 });

  // Idle life: gentle vertical bob + subtle breathing squash/stretch.
  const bob = Math.sin(frame / 12) * 6;
  const breathe = 1 + Math.sin(frame / 16) * 0.02;

  // Mouth: open while a word is being spoken, closed in the silent gaps. A fast
  // oscillation while speaking gives a believable "chatter" without phonemes.
  const speaking =
    !!captions && captions.some((w) => t >= w.start && t <= w.end);
  const chatter = Math.sin(frame * 1.7) * 0.5 + 0.5; // 0..1, fast
  const openAmount = speaking ? 0.4 + chatter * 0.6 : 0; // 0 closed, 1 wide
  const mouthH = 3 + openAmount * 17; // px
  const mouthW = 16 + openAmount * 6;

  // Blink: quick eyelid drop roughly every 3s, phase-shifted per scene.
  const blinkCycle = (frame + seed * 21) % 96;
  const eyeScaleY = blinkCycle < 4 ? 0.12 : 1;

  // Eyes glance slightly side to side for extra life.
  const glance = Math.sin(frame / 40 + seed) * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 430,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${bob}px) scale(${enter})`,
        transformOrigin: "center bottom",
      }}
    >
      <div style={{ position: "relative", width: 345, height: 345 }}>
        {/* soft glow to separate the mascot from a busy illustration */}
        <div
          style={{
            position: "absolute",
            inset: -34,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}44 0%, transparent 68%)`,
            filter: "blur(6px)",
          }}
        />

        <svg
          viewBox="0 0 200 200"
          width={345}
          height={345}
          style={{ position: "relative", overflow: "visible" }}
        >
          {/* contact shadow */}
          <ellipse cx="100" cy="190" rx="52" ry="9" fill="rgba(0,0,0,0.35)" />

          <g transform={`translate(100 118) scale(1 ${breathe}) translate(-100 -118)`}>
            {/* shoes */}
            <ellipse cx="80" cy="184" rx="15" ry="8" fill="#20282f" />
            <ellipse cx="120" cy="184" rx="15" ry="8" fill="#20282f" />

            {/* lab coat */}
            <path
              d="M62,96 L47,182 Q100,196 153,182 L138,96 Q100,112 62,96 Z"
              fill="#f4f7fa"
              stroke="rgba(15,30,40,0.14)"
              strokeWidth="2"
            />
            {/* coat lapels forming the V + teal undershirt */}
            <path d="M84,90 L100,132 L94,96 Z" fill="#dfe6ec" />
            <path d="M116,90 L100,132 L106,96 Z" fill="#dfe6ec" />
            <path d="M91,92 L100,134 L109,92 L100,100 Z" fill={accent} />
            {/* buttons */}
            <circle cx="100" cy="148" r="2.6" fill="#b9c4cd" />
            <circle cx="100" cy="164" r="2.6" fill="#b9c4cd" />

            {/* neck */}
            <rect x="92" y="76" width="16" height="18" rx="6" fill="#e0ac7e" />

            {/* head */}
            <circle cx="100" cy="58" r="30" fill="#e0ac7e" />

            {/* ears */}
            <circle cx="70" cy="60" r="6" fill="#e0ac7e" />
            <circle cx="130" cy="60" r="6" fill="#e0ac7e" />

            {/* hair */}
            <path
              d="M70,52 Q68,22 100,20 Q132,22 130,52 Q130,38 100,36 Q70,38 70,52 Z"
              fill="#3a2a1e"
            />

            {/* glasses + eyes */}
            <g transform={`translate(${glance} 0)`}>
              <line x1="97" y1="58" x2="103" y2="58" stroke="#2b2b2b" strokeWidth="2.4" />
              <circle cx="84" cy="58" r="11" fill="none" stroke="#2b2b2b" strokeWidth="2.4" />
              <circle cx="116" cy="58" r="11" fill="none" stroke="#2b2b2b" strokeWidth="2.4" />

              <g transform={`translate(84 58) scale(1 ${eyeScaleY})`}>
                <circle cx="0" cy="0" r="7" fill="#ffffff" />
                <circle cx="1.5" cy="1" r="3.4" fill="#0b1220" />
                <circle cx="2.6" cy="-1.2" r="1.1" fill="#ffffff" />
              </g>
              <g transform={`translate(116 58) scale(1 ${eyeScaleY})`}>
                <circle cx="0" cy="0" r="7" fill="#ffffff" />
                <circle cx="1.5" cy="1" r="3.4" fill="#0b1220" />
                <circle cx="2.6" cy="-1.2" r="1.1" fill="#ffffff" />
              </g>
            </g>

            {/* cheeks */}
            <circle cx="76" cy="72" r="6" fill="rgba(255,120,120,0.3)" />
            <circle cx="124" cy="72" r="6" fill="rgba(255,120,120,0.3)" />

            {/* mouth — height tracks the spoken word */}
            <ellipse cx="100" cy="80" rx={mouthW / 2} ry={mouthH / 2} fill="#20131a" />
            {/* tongue peeks in when the mouth is open */}
            {openAmount > 0.35 && (
              <ellipse
                cx="100"
                cy={80 + mouthH / 4}
                rx={mouthW / 3}
                ry={mouthH / 6}
                fill="#ff7a8a"
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
