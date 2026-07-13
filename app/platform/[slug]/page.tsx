import PlaceholderPage from "@/components/PlaceholderPage";

function titleize(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function PlatformFeaturePage({ params }: { params: { slug: string } }) {
  return (
    <PlaceholderPage
      title={titleize(params.slug)}
      description="This feature page is coming soon. Start creating a video from your paper in the meantime."
      backHref="/create"
      backLabel="Create a Video"
    />
  );
}
