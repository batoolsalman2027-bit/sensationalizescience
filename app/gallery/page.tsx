import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Gallery — Sensationalize Science" };

export default function GalleryPage() {
  return (
    <PlaceholderPage
      title="Gallery"
      description="Example videos are coming soon. In the meantime, create your first video from a research paper."
    />
  );
}
