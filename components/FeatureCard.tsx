import Icon from "./Icon";

/** Generic feature / benefit card with an icon badge. */
export default function FeatureCard({
  icon,
  title,
  body,
}: {
  icon?: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card feature-card">
      {icon && (
        <div className="icon-badge" aria-hidden="true">
          <Icon name={icon} size={21} strokeWidth={2} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
