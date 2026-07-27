"""
Section divider card — INTRODUCTION / METHODS / RESULTS. Identical design for
all three (only the word changes); rendered 3x via the SECTION_WORD / SECTION_IDX
env vars so the typeface, weight, size, position and background are byte-identical.

Inherits the segments' grade: dark cool tone + film grain, no pure white, no
default sans (Futura). The word BUILDS in via a letter stagger and leaves via a
scale-and-fade — never a hard cut.

Render: SECTION_WORD=METHODS SECTION_IDX=02 manim -qh --format=mp4 poc/scripts/section_card.py Section
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
config.background_color = "#0E141A"

WORD = os.environ.get("SECTION_WORD", "RESULTS").upper()
IDX = os.environ.get("SECTION_IDX", "03")

INK_LIGHT = "#E9E2D4"   # warm bone white (graded, not pure white)
ACCENT = "#9DB4C4"      # cool desaturated
MUTED = "#5C6B76"


class Section(Scene):
    def construct(self):
        grain = ImageMobject("poc/out/fig_src/grain.png").scale_to_fit_width(config.frame_width)
        grain.set_opacity(0.08)
        self.add(grain)

        # section index, small and muted, above the word
        idx = Text(f"{IDX}", font=FONT, weight=BOLD, color=ACCENT).scale(0.34)

        # word as individual letters for the stagger build + wide tracking
        letters = VGroup(*[Text(c, font=FONT, weight=BOLD, color=INK_LIGHT).scale(1.05) for c in WORD])
        letters.arrange(RIGHT, buff=0.20)

        rule = Line(LEFT, RIGHT, color=MUTED, stroke_width=2).set_width(letters.width * 0.55)

        group = VGroup(idx, letters, rule).arrange(DOWN, buff=0.42).move_to([0, 1.1, 0])

        # BUILD IN: index fades, letters stagger up, rule wipes
        self.play(FadeIn(idx, shift=DOWN * 0.1), run_time=0.35)
        self.play(LaggedStart(*[FadeIn(l, shift=UP * 0.25) for l in letters],
                              lag_ratio=0.14, run_time=0.9))
        self.play(Create(rule), run_time=0.4)
        self.wait(0.9)
        # OUT: scale-and-fade (never a cut)
        self.play(group.animate.scale(1.06).set_opacity(0.0),
                  grain.animate.set_opacity(0.0), run_time=0.6)
