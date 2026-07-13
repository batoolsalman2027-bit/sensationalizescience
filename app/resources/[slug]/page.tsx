import PlaceholderPage from "@/components/PlaceholderPage";
import { findNavLeaf } from "@/config/navigation";

function titleize(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ResourceSubPage({ params }: { params: { slug: string } }) {
  const leaf = findNavLeaf(`/resources/${params.slug}`);
  return (
    <PlaceholderPage
      title={leaf?.label ?? titleize(params.slug)}
      description={leaf?.description}
      backHref="/resources"
      backLabel="Back to Resources"
    />
  );
}
