import Link from "next/link";
import { Film, Play } from "lucide-react";
import type { GalleryItem } from "@/config/gallery";

/** Vertical video card used on the home page and gallery grid. */
export default function VideoCard({ item }: { item: GalleryItem }) {
  return (
    <div className="video-card">
      <div className="video-thumb">
        {item.videoUrl ? (
          <video src={item.videoUrl} preload="metadata" muted playsInline />
        ) : (
          <div className="thumb-fallback" aria-hidden="true">
            <Film size={28} strokeWidth={1.5} />
          </div>
        )}
        <span className="play-orb" aria-hidden="true">
          <Play size={18} fill="currentColor" />
        </span>
        <span className="badge-dur">{item.duration}</span>
      </div>
      <div className="video-meta">
        <div className="vtitle">{item.paperTitle}</div>
        <div className="chips">
          <span className="chip chip-static">{item.field}</span>
          <span className="chip chip-static">{item.style}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{item.source}</div>
        <Link
          href={`/gallery/${item.id}`}
          className="btn btn-outline"
          style={{ marginTop: 4, alignSelf: "flex-start", padding: "8px 16px", fontSize: 13.5 }}
        >
          View details
        </Link>
      </div>
    </div>
  );
}
