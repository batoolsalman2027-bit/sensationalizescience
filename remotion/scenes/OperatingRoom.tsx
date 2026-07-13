import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** An operating table with a heart monitor (animated EKG) and IV drip. */
export function OperatingRoom() {
  const frame = useCurrentFrame();
  const ekgOffset = interpolate(frame % 90, [0, 90], [0, -400]);
  const dripT = (frame % 45) / 45;
  const dripY = interpolate(dripT, [0, 1], [0, 70]);
  const dripOpacity = interpolate(dripT, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      <rect x="0" y="0" width="800" height="330" fill="#132621" />
      <rect x="0" y="330" width="800" height="130" fill="#1c352e" />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 100} y="0" width="2" height="330" fill="#1f4038" />
      ))}

      {/* operating table */}
      <rect x="280" y="300" width="240" height="24" rx="8" fill="#3a4a55" />
      <rect x="300" y="324" width="16" height="70" fill="#2b3843" />
      <rect x="484" y="324" width="16" height="70" fill="#2b3843" />

      {/* IV stand */}
      <rect x="620" y="150" width="6" height="180" fill="#4a5a63" />
      <rect x="590" y="150" width="66" height="6" fill="#4a5a63" />
      <rect x="612" y="160" width="22" height="30" rx="4" fill="#bfe9e0" opacity="0.5" />
      <circle cx="623" cy="190" r="4" fill="#7fd8cc" opacity={dripOpacity} transform={`translate(0, ${dripY})`} />

      {/* heart monitor */}
      <g transform="translate(90, 130)">
        <rect x="0" y="0" width="190" height="130" rx="10" fill="#0d1a17" stroke="#2f4a42" strokeWidth="3" />
        <clipPath id="ekg-clip">
          <rect x="10" y="14" width="170" height="70" />
        </clipPath>
        <g clipPath="url(#ekg-clip)">
          <path
            d="M -400 50 L -370 50 L -360 20 L -345 80 L -330 10 L -315 50 L -280 50 L -270 50 L -260 20 L -245 80 L -230 10 L -215 50 L -180 50 L -170 50 L -160 20 L -145 80 L -130 10 L -115 50 L -80 50 L -70 50 L -60 20 L -45 80 L -30 10 L -15 50 L 20 50 L 30 50 L 40 20 L 55 80 L 70 10 L 85 50 L 120 50 L 130 50 L 140 20 L 155 80 L 170 10 L 185 50 L 220 50"
            fill="none"
            stroke="#4ade80"
            strokeWidth="3"
            transform={`translate(${ekgOffset + 400}, 14)`}
          />
        </g>
        <text x="10" y="112" fill="#4ade80" fontSize="20" fontFamily="ui-sans-serif">72 bpm</text>
      </g>

      <Character x={340} y={280} pose="operating" outfit="#5ac8e0" skin="#e0ac7e" />
    </svg>
  );
}
