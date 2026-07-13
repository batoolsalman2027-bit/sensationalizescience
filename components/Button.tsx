import Link from "next/link";

type Variant = "primary" | "blue" | "outline" | "ghost";

/** CTA button rendered as a real link (uses Next routing). */
export default function Button({
  href,
  children,
  variant = "primary",
  large = false,
  className = "",
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  large?: boolean;
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  const cls = `btn btn-${variant}${large ? " btn-lg" : ""} ${className}`.trim();
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
