"""
Section LABEL overlay — a small, semi-transparent "logo" that sits over the
footage at the start of each section (INTRODUCTION / METHODS / RESULTS), instead
of a full-frame divider card. Rendered on a TRANSPARENT background so it can be
composited onto the video with a fade in/out.

Identical design for all three (SECTION_WORD / SECTION_IDX env vars); bottom-left,
Futura, warm bone-white on a subtle dark scrim for legibility over any footage.

Render: SECTION_WORD=METHODS SECTION_IDX=02 manim -qh -s -t --format=png poc/scripts/label_card.py Label
"""
import os
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

WORD = os.environ.get("SECTION_WORD", "RESULTS").upper()
IDX = os.environ.get("SECTION_IDX", "03")
INK_LIGHT = "#F0EADB"
ACCENT = "#A9C0D0"


class Label(Scene):
    def construct(self):
        idx = Text(IDX, font=FONT, weight=BOLD, color=ACCENT).scale(0.30)
        letters = VGroup(*[Text(c, font=FONT, weight=BOLD, color=INK_LIGHT).scale(0.50) for c in WORD])
        letters.arrange(RIGHT, buff=0.08)
        row = VGroup(idx, letters).arrange(RIGHT, buff=0.30, aligned_edge=DOWN)
        rule = Line(LEFT, RIGHT, color=ACCENT, stroke_width=2.5).set_width(letters.width)
        rule.next_to(letters, DOWN, buff=0.16, aligned_edge=LEFT)

        label = VGroup(row, rule)
        backing = RoundedRectangle(width=label.width + 0.8, height=label.height + 0.55,
                                   corner_radius=0.14, fill_color="#0A1015",
                                   fill_opacity=0.45, stroke_color=ACCENT, stroke_width=1.0,
                                   stroke_opacity=0.35).move_to(label)
        VGroup(backing, label).to_corner(DL, buff=0.7)
        self.add(backing, label)
