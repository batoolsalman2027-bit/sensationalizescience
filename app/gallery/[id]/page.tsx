import { redirect } from "next/navigation";

/** Individual gallery items are paused while the gallery is Coming Soon. */
export default function GalleryItemPage() {
  redirect("/gallery");
}
