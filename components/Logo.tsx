export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* three electron orbits — hairline */}
      <g stroke="var(--ink)" strokeWidth="1.5" fill="none" opacity="0.9">
        <ellipse cx="24" cy="24" rx="20" ry="7.5" />
        <ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(120 24 24)" />
      </g>
      {/* nucleus with a play glyph */}
      <circle cx="24" cy="24" r="10" fill="var(--blue)" />
      <path d="M21.5 20v8l6.5-4-6.5-4z" fill="#fff" />
    </svg>
  );
}
