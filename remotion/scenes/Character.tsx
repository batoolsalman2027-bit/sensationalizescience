import { useCurrentFrame } from "remotion";

export type Pose =
  | "typing"
  | "pipetting"
  | "operating"
  | "presenting"
  | "monitoring"
  | "writing";

interface CharacterProps {
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  skin?: string;
  outfit?: string;
  pose: Pose;
}

/** A small flat-design person, geometric shapes only, with a per-pose idle animation loop. */
export function Character({
  x,
  y,
  scale = 1,
  flip = false,
  skin = "#e0ac7e",
  outfit = "#2dd4bf",
  pose,
}: CharacterProps) {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 12) * 3;
  const swing = Math.sin(frame / 9) * 1;

  // Each pose drives one repeated "action" gesture on top of the idle bob.
  const rightArmDeg =
    pose === "typing"
      ? Math.sin(frame / 6) * 18
      : pose === "pipetting"
      ? -35 + Math.sin(frame / 14) * 12
      : pose === "writing"
      ? Math.sin(frame / 8) * 22
      : pose === "presenting"
      ? -55
      : pose === "operating"
      ? -25 + Math.sin(frame / 20) * 6
      : Math.sin(frame / 16) * 6;

  const leftArmDeg =
    pose === "typing"
      ? -Math.sin(frame / 6) * 18
      : pose === "operating"
      ? 25 - Math.sin(frame / 20) * 6
      : pose === "monitoring"
      ? -15
      : -Math.sin(frame / 16) * 6;

  return (
    <g transform={`translate(${x}, ${y + bob}) scale(${flip ? -scale : scale}, ${scale})`}>
      {/* legs */}
      <rect x="-15" y="42" width="13" height="46" rx="6" fill="#2b3644" />
      <rect x="2" y="42" width="13" height="46" rx="6" fill="#2b3644" />
      {/* torso */}
      <rect
        x="-21"
        y="-8"
        width="42"
        height="56"
        rx="15"
        fill={outfit}
        transform={`rotate(${swing})`}
      />
      {/* head */}
      <circle cx="0" cy="-34" r="21" fill={skin} />
      <circle cx="7" cy="-38" r="3.2" fill="#20282f" />
      {/* left arm */}
      <g transform={`rotate(${leftArmDeg}, -21, 2)`}>
        <rect x="-31" y="2" width="11" height="36" rx="5.5" fill={skin} />
      </g>
      {/* right arm */}
      <g transform={`rotate(${rightArmDeg}, 21, 2)`}>
        <rect x="20" y="2" width="11" height="36" rx="5.5" fill={skin} />
      </g>
    </g>
  );
}
