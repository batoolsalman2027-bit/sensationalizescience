import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** A desk with a monitor showing code lines typing in, and a blinking cursor. */
export function OfficeCoding() {
  const frame = useCurrentFrame();
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const lineCount = Math.min(6, 1 + Math.floor(frame / 18));

  const lineWidths = [120, 90, 140, 70, 110, 60];

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      <rect x="0" y="0" width="800" height="330" fill="#171d27" />
      <rect x="0" y="330" width="800" height="130" fill="#232c3a" />

      {/* monitor */}
      <g transform="translate(230, 100)">
        <rect x="0" y="0" width="340" height="210" rx="10" fill="#0e1520" stroke="#3a4557" strokeWidth="4" />
        <rect x="150" y="210" width="40" height="24" fill="#3a4557" />
        <rect x="110" y="234" width="120" height="8" rx="4" fill="#3a4557" />
        {lineWidths.slice(0, lineCount).map((w, i) => (
          <rect key={i} x="24" y={26 + i * 26} width={w} height="10" rx="3" fill={i % 2 === 0 ? "#5eead4" : "#7dd3fc"} opacity="0.85" />
        ))}
        {cursorOn && lineCount < 6 && (
          <rect x={24 + lineWidths[lineCount]} y={26 + lineCount * 26} width="8" height="10" fill="#e8eaf0" />
        )}
      </g>

      {/* desk */}
      <rect x="150" y="330" width="500" height="20" fill="#3a4557" />
      <rect x="180" y="350" width="16" height="70" fill="#2b3644" />
      <rect x="590" y="350" width="16" height="70" fill="#2b3644" />

      {/* plant */}
      <g transform="translate(600, 300)">
        <rect x="-14" y="10" width="28" height="24" rx="4" fill="#4a5a55" />
        <circle cx="0" cy="0" r="14" fill="#4ade80" opacity="0.8" />
        <circle cx="-12" cy="6" r="10" fill="#34d399" opacity="0.8" />
        <circle cx="12" cy="6" r="10" fill="#34d399" opacity="0.8" />
      </g>

      <Character x={330} y={310} pose="typing" outfit="#6b8afd" skin="#e0ac7e" />
    </svg>
  );
}
