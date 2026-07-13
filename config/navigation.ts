/**
 * Centralized navigation config for the whole site. Edit labels/links here and
 * they propagate to the desktop dropdowns, the mobile slide-out menu, and the
 * footer. Keep hrefs as real routes (there are matching pages/placeholders).
 */

export interface NavLeaf {
  label: string;
  href: string;
  description?: string;
}

export interface NavSection {
  /** Optional column heading (used by grouped menus like Resources). */
  heading?: string;
  items: NavLeaf[];
}

export interface NavItem {
  label: string;
  href: string;
  /** Dropdown / submenu contents. Omit for a plain link (Home, Pricing). */
  sections?: NavSection[];
  /** Layout hint for the desktop dropdown panel. */
  layout?: "list" | "grid" | "columns";
}

export const MAIN_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Create", href: "/create" },
  {
    label: "Gallery",
    href: "/gallery",
    layout: "list",
    sections: [
      {
        items: [
          { label: "Gallery", href: "/gallery" },
          { label: "My Library", href: "/library" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    layout: "columns",
    sections: [
      {
        heading: "Learn",
        items: [
          { label: "Blog", href: "/resources/blog" },
          { label: "Science Communication Guide", href: "/resources/science-communication-guide" },
          { label: "Tutorials", href: "/resources/tutorials" },
          { label: "Creator Academy", href: "/resources/creator-academy" },
          { label: "FAQ", href: "/faq" },
        ],
      },
      {
        heading: "Company",
        items: [
          { label: "About", href: "/about" },
          { label: "Careers", href: "/resources/careers" },
          { label: "Contact", href: "/resources/contact" },
          { label: "Press", href: "/resources/press" },
        ],
      },
      {
        heading: "Trust",
        items: [
          { label: "Security", href: "/resources/security" },
          { label: "Privacy", href: "/resources/privacy" },
          { label: "Terms", href: "/resources/terms" },
          { label: "Trust Center", href: "/resources/trust-center" },
        ],
      },
      {
        heading: "Community",
        items: [
          { label: "Research Spotlight", href: "/resources/research-spotlight" },
          { label: "Featured Labs", href: "/resources/featured-labs" },
          { label: "Student Program", href: "/resources/student-program" },
          { label: "Creator Program", href: "/resources/creator-program" },
        ],
      },
      {
        heading: "Developers",
        items: [
          { label: "API", href: "/resources/api" },
          { label: "Documentation", href: "/resources/documentation" },
          { label: "Integrations", href: "/resources/integrations" },
        ],
      },
    ],
  },
  {
    label: "Enterprise",
    href: "/enterprise",
    layout: "grid",
    sections: [
      {
        items: [
          { label: "Universities", href: "/enterprise/universities", description: "Scale science communication across campus." },
          { label: "Research Institutes", href: "/enterprise/research-institutes", description: "Share findings with the public faster." },
          { label: "Scientific Journals", href: "/enterprise/scientific-journals", description: "Video abstracts for every publication." },
          { label: "Publishers", href: "/enterprise/publishers", description: "Turn catalogs into engaging shorts." },
          { label: "Biotech and Pharma", href: "/enterprise/biotech-and-pharma", description: "Communicate R&D with clarity." },
          { label: "Enterprise Security", href: "/enterprise/enterprise-security", description: "SSO, audit logs, and data controls." },
          { label: "Bulk Video Generation", href: "/enterprise/bulk-video-generation", description: "Generate hundreds of videos at once." },
          { label: "Custom Branding", href: "/enterprise/custom-branding", description: "Your logo, colors, and templates." },
          { label: "API Access", href: "/enterprise/api-access", description: "Automate video creation via API." },
          { label: "Contact Sales", href: "/enterprise/contact-sales", description: "Talk to our team about a plan." },
        ],
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
];

export const AUTH_NAV = {
  login: { label: "Log in", href: "/login" } as NavLeaf,
  getStarted: { label: "Sign Up", href: "/signup" } as NavLeaf,
};

/** Find a leaf anywhere in the nav tree by its href (used by placeholder pages). */
export function findNavLeaf(href: string): NavLeaf | undefined {
  for (const item of MAIN_NAV) {
    if (item.href === href) return { label: item.label, href: item.href };
    for (const section of item.sections ?? []) {
      const leaf = section.items.find((l) => l.href === href);
      if (leaf) return leaf;
    }
  }
  return undefined;
}
