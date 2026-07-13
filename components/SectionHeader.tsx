export default function SectionHeader({
  eyebrow,
  title,
  desc,
  align = "left",
  nowrap = false,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: "center" | "left";
  nowrap?: boolean;
}) {
  return (
    <div className={`section-head${align === "left" ? " left" : ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className={`section-title${nowrap ? " nowrap" : ""}`}>{title}</h2>
      {desc && <p className="section-desc">{desc}</p>}
    </div>
  );
}
