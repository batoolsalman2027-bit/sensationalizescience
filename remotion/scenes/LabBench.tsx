import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** A lab bench with a bubbling flask and a scientist pipetting into it. */
export function LabBench() {
  const frame = useCurrentFrame();
  const bubbleT = (frame % 60) / 60;
  const bubble1Y = interpolate(bubbleT, [0, 1], [0, -60]);
  const bubble1Opacity = interpolate(bubbleT, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const bubble2T = ((frame + 25) % 60) / 60;
  const bubble2Y = interpolate(bubble2T, [0, 1], [0, -50]);
  const bubble2Opacity = interpolate(bubble2T, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      {/* back wall + bench */}
      <rect x="0" y="0" width="800" height="330" fill="#182130" />
      <rect x="0" y="330" width="800" height="130" fill="#232c3a" />
      <rect x="0" y="330" width="800" height="10" fill="#3a4557" />

      {/* shelf with jars */}
      <rect x="560" y="120" width="200" height="10" fill="#3a4557" />
      {[590, 630, 670, 710].map((cx, i) => (
        <rect key={i} x={cx - 12} y={90} width="24" height="30" rx="4" fill="#3a4a5f" opacity={0.9} />
      ))}

      {/* test tube rack */}
      <rect x="120" y="290" width="110" height="14" rx="4" fill="#4a5a6f" />
      {[135, 160, 185, 210].map((cx, i) => (
        <rect key={i} x={cx - 6} y={250} width="12" height="46" rx="6" fill="#5a90a0" opacity={0.85} />
      ))}

      {/* flask with bubbling liquid */}
      <g transform="translate(380, 250)">
        <path d="M -14 0 L -14 -40 L 14 -40 L 14 0 L 34 46 A 20 12 0 0 1 14 60 L -14 60 A 20 12 0 0 1 -34 46 Z" fill="#4ac8b8" opacity="0.25" stroke="#2dd4bf" strokeWidth="3" />
        <rect x="-16" y="-46" width="32" height="8" rx="3" fill="#2dd4bf" />
        <circle cx="0" cy="35" r="5" fill="#5eead4" opacity={bubble1Opacity} transform={`translate(0, ${bubble1Y})`} />
        <circle cx="-8" cy="35" r="3.5" fill="#5eead4" opacity={bubble2Opacity} transform={`translate(0, ${bubble2Y})`} />
      </g>

      <Character x={300} y={300} pose="pipetting" outfit="#e8eaf0" skin="#e0ac7e" />
    </svg>
  );
}
