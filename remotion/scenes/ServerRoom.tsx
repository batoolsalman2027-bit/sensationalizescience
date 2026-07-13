import { useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** Server racks with blinking LEDs at staggered phases, an engineer monitoring. */
export function ServerRoom() {
  const frame = useCurrentFrame();

  const rackXs = [90, 220, 350];

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      <rect x="0" y="0" width="800" height="330" fill="#151a26" />
      <rect x="0" y="330" width="800" height="130" fill="#20263a" />

      {rackXs.map((rx, rackI) => (
        <g key={rackI} transform={`translate(${rx}, 100)`}>
          <rect x="0" y="0" width="90" height="220" rx="6" fill="#232b3d" stroke="#3a4560" strokeWidth="3" />
          {Array.from({ length: 6 }).map((_, i) => {
            const phase = rackI * 7 + i * 5;
            const on = Math.floor((frame + phase) / 12) % 3 !== 0;
            return (
              <g key={i}>
                <rect x="10" y={16 + i * 33} width="70" height="20" rx="3" fill="#1a2030" />
                <circle cx="20" cy={26 + i * 33} r="3.5" fill={on ? "#4ade80" : "#245038"} />
                <circle cx="32" cy={26 + i * 33} r="3.5" fill={!on ? "#f59e0b" : "#5a4620"} />
              </g>
            );
          })}
        </g>
      ))}

      {/* engineer's laptop stand */}
      <rect x="520" y="300" width="150" height="16" rx="4" fill="#33414f" />
      <path d="M 540 300 L 640 300 L 630 260 L 550 260 Z" fill="#7dd3fc" opacity="0.85" />

      <Character x={620} y={300} pose="monitoring" outfit="#7c3aed" skin="#e0ac7e" />
    </svg>
  );
}
