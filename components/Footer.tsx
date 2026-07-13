import Link from "next/link";
import Logo from "./Logo";
import { MAIN_NAV } from "@/config/navigation";
import { SITE } from "@/config/site";

/** Pull a top-level nav item's flattened leaves for a footer column. */
function leavesOf(label: string) {
  const item = MAIN_NAV.find((i) => i.label === label);
  return (item?.sections ?? []).flatMap((s) => s.items);
}

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Create",
    links: [
      { label: "Create a Video", href: "/create" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Gallery",
    links: [
      { label: "Gallery", href: "/gallery" },
      { label: "My Library", href: "/library" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/resources/careers" },
      { label: "Blog", href: "/resources/blog" },
      { label: "Contact", href: "/resources/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Enterprise",
    links: [...leavesOf("Enterprise").slice(0, 5), { label: "Contact Sales", href: "/enterprise/contact-sales" }],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="nav-brand" aria-label="Synapse home">
              <Logo size={32} />
              <span className="wordmark">synapse</span>
            </Link>
            <p>{SITE.tagline}</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="footer-col">
              <p className="footer-heading">{col.heading}</p>
              {col.links.map((l) => (
                <Link key={l.href + l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Synapse. All rights reserved.</span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link href="/resources/privacy">Privacy</Link>
            <Link href="/resources/terms">Terms</Link>
            <Link href="/resources/security">Security</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
