import Link from "next/link";
import Logo from "./Logo";
import { SITE } from "@/config/site";

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
      { label: "Contact", href: "/resources/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="nav-brand" aria-label={`${SITE.name} home`}>
              <Logo size={32} />
              <span className="wordmark">{SITE.name}</span>
            </Link>
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
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
