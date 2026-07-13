import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "./Character";

/** A whiteboard with bullet points appearing one by one, a presenter pointing at it. */
export function LectureHall() {
  const frame = useCurrentFrame();
  const bulletCount = Math.min(3, Math.floor(frame / 30));

  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%">
      <rect x="0" y="0" width="800" height="330" fill="#1a1f2b" />
      <rect x="0" y="330" width="800" height="130" fill="#242a38" />

      {/* whiteboard */}
      <rect x="150" y="60" width="380" height="220" rx="8" fill="#eef3f2" />
      <rect x="150" y="60" width="380" height="220" rx="8" fill="none" stroke="#3a4557" strokeWidth="6" />
      {[0, 1, 2].map((i) => {
        const opacity = interpolate(bulletCount, [i, i + 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g key={i} opacity={opacity}>
            <circle cx="182" cy={112 + i * 46} r="7" fill="#0d9488" />
            <rect x="204" y={104 + i * 46} width={110 + i * 40} height="14" rx="4" fill="#33414f" opacity="0.75" />
          </g>
        );
      })}

      {/* audience seats silhouette */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={40 + i * 120} y="392" width="60" height="34" rx="10" fill="#2b3340" />
      ))}

      <Character x={620} y={240} pose="presenting" flip outfit="#0d9488" skin="#e0ac7e" />
    </svg>
  );
}
