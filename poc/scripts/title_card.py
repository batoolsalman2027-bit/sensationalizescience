"""
Title card (spec §3.0.1): the opening slide — paper title, first author, journal,
year, DOI. Never generative (it's text). Clean dark card, title dominant.

Render: manim -qh --format=mp4 poc/scripts/title_card.py Title
"""
import os
import json
from pathlib import Path
from manim import *
import manimpango

for _w in ("Regular", "Medium", "SemiBold", "Bold"):
    _p = f"poc/assets/fonts/Montserrat-{_w}.ttf"
    if os.path.exists(_p):
        manimpango.register_font(_p)
FONT = "Montserrat"

config.pixel_width = 1920
config.pixel_height = 1080
config.frame_height = 8.0
config.frame_width = 14.222
config.background_color = "#111A22"

B = json.loads(Path("poc/out/paper-brief.json").read_text())
DOI = os.environ.get("PAPER_DOI", B.get("doi", "10.1038/s41598-025-00278-x"))


def wrap(text, maxchars=44):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= maxchars:
            cur = (cur + " " + w).strip()
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return "\n".join(lines)


class Title(Scene):
    def construct(self):
        title = Text(wrap(B["title"]), font=FONT, weight=BOLD,
                     color="#F2F6FA", line_spacing=0.95).scale(0.44)
        author = Text(f"{B['firstAuthor']} et al.", font=FONT,
                      weight=BOLD, color="#9DC3E6").scale(0.30)
        venue = Text(f"{B['journal']}  ·  {B.get('year', '2025')}", font=FONT,
                     color="#8FA3B3").scale(0.24)
        doi = Text(f"doi:{DOI}", font=FONT, color="#5E7180").scale(0.18)

        rule = Line(LEFT, RIGHT, color="#2C3E4C", stroke_width=2).set_width(title.width)

        block = VGroup(title, rule, author, venue, doi).arrange(
            DOWN, buff=0.32, aligned_edge=LEFT)
        block.move_to(ORIGIN)

        self.play(FadeIn(title, shift=UP * 0.15), run_time=0.5)
        self.play(FadeIn(rule), FadeIn(author), FadeIn(venue), FadeIn(doi), run_time=0.5)
        self.wait(2.4)
