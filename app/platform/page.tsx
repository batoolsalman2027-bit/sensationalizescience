import { redirect } from "next/navigation";

/** Platform hub now goes straight to create. */
export default function PlatformPage() {
  redirect("/create");
}
