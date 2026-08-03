import type { Metadata } from "next";
import Container from "@/components/Container";
import Reveal from "@/components/Reveal";
import { GALLERY_CATEGORIES } from "@/config/site";

export const metadata: Metadata = { title: "Gallery — Sensationalize Science" };

export default function GalleryPage() {
  return (
    <section className="section">
      <Container>
        <Reveal>
          <div className="section-head left">
            <span className="eyebrow">Gallery</span>
            <h1 className="section-title">Example videos</h1>
            <p className="section-desc">
              Real papers, reimagined as short explainer videos — grouped by field of science.
            </p>
          </div>
        </Reveal>

        {GALLERY_CATEGORIES.map((cat) => (
          <div key={cat.category} className="gallery-category">
            <Reveal>
              <h2 className="gallery-category-title">{cat.category}</h2>
            </Reveal>
            <Reveal>
              <div className="gallery-grid">
                {cat.videos.map((v) => (
                  <figure key={v.src} className="gallery-card">
                    <video
                      className="gallery-video"
                      controls
                      preload="none"
                      poster={v.poster}
                      playsInline
                    >
                      <source src={v.src} type="video/mp4" />
                    </video>
                    <figcaption className="gallery-card-body">
                      <h3 className="gallery-card-title">{v.title}</h3>
                      <p className="gallery-card-caption">{v.caption}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Reveal>
          </div>
        ))}

        <Reveal>
          <p className="gallery-soon">
            <span className="tag">Coming soon</span>
            More example videos coming soon.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
