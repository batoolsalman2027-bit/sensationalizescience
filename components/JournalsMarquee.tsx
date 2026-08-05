"use client";

/**
 * Infinite horizontal marquee of journals that accept video abstracts.
 *
 * Pure-CSS animation (see `.jm-*` in globals.css) — no JS timer, no motion lib.
 * The track holds two identical copies of the list and translates -50%, so the
 * loop is seamless; edge fade masks hide the wrap. Pauses on hover and respects
 * prefers-reduced-motion.
 *
 * Logos live in /public/journals/<slug>.png (user-supplied brand assets). If a
 * logo file is missing or fails to load, the chip falls back to a text wordmark,
 * so the row never shows a broken image.
 */

type Journal = {
  label: string;        // text wordmark + <img> alt
  slug?: string;        // /journals/<slug>.png; omit to force text wordmark
  publisher?: string;   // small subtitle, shown on text fallback
  big?: boolean;        // larger height for logos with baked-in taglines/padding
};

const JOURNALS: Journal[] = [
  { label: "JAMA", slug: "jama", big: true },
  { label: "New England Journal of Medicine", slug: "nejm", big: true },
  { label: "BMJ", slug: "bmj" },
  { label: "Journal of Cell Biology", slug: "jcb" },
  { label: "Cell Press", slug: "cell-press" },
  { label: "JBJS", slug: "jbjs", big: true },
  { label: "Nature", slug: "nature", big: true },
  { label: "Science", slug: "science" },
  { label: "Global Spine Journal", slug: "global-spine-journal", publisher: "SAGE" },
  { label: "Orthopaedic Surgery", publisher: "Wiley" },
  { label: "IEEE Trans. Biomedical Engineering", slug: "ieee" },
  { label: "MDPI", slug: "mdpi" },
  { label: "Journal of Clinical Medicine", slug: "journal-of-clinical-medicine" },
];

function JournalChip({ j, aria }: { j: Journal; aria?: boolean }) {
  return (
    <span className="jm-item" aria-hidden={aria}>
      {j.slug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`jm-logo${j.big ? " jm-logo--lg" : ""}`}
          src={`/journals/${j.slug}.png`}
          alt={j.label}
          draggable={false}
          onError={(e) => {
            // Missing/broken logo → reveal the text fallback sibling.
            const img = e.currentTarget;
            img.style.display = "none";
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "inline-flex";
          }}
        />
      )}
      <span className="jm-fallback" style={{ display: j.slug ? "none" : "inline-flex" }}>
        <span className="jm-name">{j.label}</span>
        {j.publisher && <span className="jm-pub">{j.publisher}</span>}
      </span>
    </span>
  );
}

export default function JournalsMarquee() {
  // Two copies for a seamless -50% loop; second copy hidden from a11y tree.
  return (
    <div className="jm" role="marquee" aria-label="Journals that accept video abstracts">
      <div className="jm-track">
        {JOURNALS.map((j, i) => (
          <JournalChip key={`a-${i}`} j={j} />
        ))}
        <span className="jm-item jm-item--more">
          <span className="jm-name">100+ others</span>
        </span>
        {JOURNALS.map((j, i) => (
          <JournalChip key={`b-${i}`} j={j} aria />
        ))}
        <span className="jm-item jm-item--more" aria-hidden>
          <span className="jm-name">100+ others</span>
        </span>
      </div>
    </div>
  );
}
