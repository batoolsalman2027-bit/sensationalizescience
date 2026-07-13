import PlaceholderPage from "@/components/PlaceholderPage";
import { findNavLeaf } from "@/config/navigation";

function titleize(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function EnterpriseSubPage({ params }: { params: { slug: string } }) {
  const leaf = findNavLeaf(`/enterprise/${params.slug}`);
  return (
    <PlaceholderPage
      title={leaf?.label ?? titleize(params.slug)}
      description={leaf?.description}
      backHref="/enterprise"
      backLabel="Back to Enterprise"
    />
  );
}
