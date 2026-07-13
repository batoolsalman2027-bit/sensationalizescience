"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import VideoCard from "./VideoCard";
import { GALLERY_ITEMS, DISCIPLINES, VIDEO_STYLES } from "@/config/gallery";

export default function GalleryBrowser() {
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  const results = useMemo(() => {
    return GALLERY_ITEMS.filter((item) => {
      if (discipline && item.field !== discipline) return false;
      if (style && item.style !== style) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !item.paperTitle.toLowerCase().includes(q) &&
          !item.source.toLowerCase().includes(q) &&
          !item.field.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [query, discipline, style]);

  return (
    <div>
      <div className="search-bar" style={{ margin: "0 auto 24px" }}>
        <Search size={18} color="var(--ink-soft)" />
        <input
          type="search"
          placeholder="Search papers, journals, or fields..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the gallery"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        <div className="chips">
          <button
            className={`chip${discipline === null ? " chip-active" : ""}`}
            onClick={() => setDiscipline(null)}
          >
            All disciplines
          </button>
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              className={`chip${discipline === d ? " chip-active" : ""}`}
              onClick={() => setDiscipline(discipline === d ? null : d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="chips">
          <button
            className={`chip${style === null ? " chip-active" : ""}`}
            onClick={() => setStyle(null)}
          >
            All styles
          </button>
          {VIDEO_STYLES.map((s) => (
            <button
              key={s}
              className={`chip${style === s ? " chip-active" : ""}`}
              onClick={() => setStyle(style === s ? null : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", textAlign: "center", padding: "40px 0" }}>
          No videos match your filters yet.
        </p>
      ) : (
        <div className="grid grid-4">
          {results.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
