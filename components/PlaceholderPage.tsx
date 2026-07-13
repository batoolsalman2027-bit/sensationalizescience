import Container from "./Container";
import Button from "./Button";

/** Reusable "coming soon" page for nav destinations without full content yet. */
export default function PlaceholderPage({
  title,
  description,
  backHref = "/",
  backLabel = "Back to home",
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <Container>
      <div className="placeholder-page">
        <span className="tag">Coming soon</span>
        <h1 className="section-title" style={{ fontSize: "clamp(34px, 6vw, 60px)" }}>
          {title}
        </h1>
        <p className="section-desc">
          {description ??
            "This page is on the way. In the meantime, you can start creating a video from your paper."}
        </p>
        <div className="hero-ctas">
          <Button href="/create" variant="blue" large>
            Create a Video
          </Button>
          <Button href={backHref} variant="outline" large>
            {backLabel}
          </Button>
        </div>
      </div>
    </Container>
  );
}
