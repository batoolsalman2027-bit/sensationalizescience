import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** An outdoor field-research scene: sun, tree, and a researcher writing on a clipboard. */
export function FieldResearch() {
  const frame = useCurrentFrame();
  const leafSway = Math.sin(frame / 20) * 4;
  const birdX = interpolate(frame % 150, [0, 150], [-40, 840]);

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      <rect x="0" y="0" width="800" height="330" fill="#16202a" />
      <rect x="0" y="300" width="800" height="160" fill="#1f3326" />

      {/* sun */}
      <circle cx="670" cy="90" r="46" fill="#f59e0b" opacity="0.85" />

      {/* bird */}
      <path
        d={`M ${birdX} 60 q 8 -8 16 0 q 8 -8 16 0`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* tree */}
      <g transform="translate(150, 300)">
        <rect x="-8" y="-30" width="16" height="70" fill="#4a3728" />
        <g transform={`rotate(${leafSway})`}>
          <circle cx="0" cy="-70" r="55" fill="#2f855a" opacity="0.9" />
          <circle cx="-40" cy="-40" r="38" fill="#38a169" opacity="0.9" />
          <circle cx="40" cy="-40" r="38" fill="#38a169" opacity="0.9" />
        </g>
      </g>

      {/* ground line + small plants */}
      <rect x="0" y="300" width="800" height="6" fill="#2f4a3a" />
      {[420, 460, 520, 560].map((cx, i) => (
        <path key={i} d={`M ${cx} 300 q 6 -20 0 -34`} stroke="#4ade80" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}

      {/* clipboard */}
      <rect x="430" y="270" width="46" height="60" rx="4" fill="#d9d2c3" transform="rotate(-8 453 300)" />

      <Character x={480} y={300} pose="writing" outfit="#d97706" skin="#e0ac7e" />
    </svg>
  );
}
