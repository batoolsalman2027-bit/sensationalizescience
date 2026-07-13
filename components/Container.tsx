export default function Container({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`container ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
