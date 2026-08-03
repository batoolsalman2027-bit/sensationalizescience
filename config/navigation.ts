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
    layout: "list",
    sections: [
      {
        items: [
          { label: "FAQ", href: "/faq" },
          { label: "Contact", href: "/resources/contact" },
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
