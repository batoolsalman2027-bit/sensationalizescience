"""
PoC: full recreation of Fig 3 (A-J) from the DIGITIZED data.

- A-F, H-J : bar charts drawn to the AI-recovered values, with true axes
  (incl. panel E starting at 15), error whiskers, rotated y-axis titles,
  the TBHP/BMSCs +/- condition matrix, and the p-value significance brackets.
- G        : western blot rendered as schematic bands whose intensity is
  driven by the H/I/J folds (a blot has no digitizable numbers). Flagged
  as schematic in the feasibility report.

Nature-journal aesthetic, 16:9. Nothing is faked: every bar height and every
p-label is the recovered datum.

Render: manim -qh --format=mp4 poc/scripts/fig3_manim.py Fig3   # 1920x1080
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
config.background_color = "#FBFCFE"

DATA = json.loads(Path("poc/out/fig3-digitized.json").read_text())
PANELS = {p["id"]: p for p in DATA["panels"]}

CONTROL = "#9DC3E6"
TBHP    = "#F4C6DD"
BMSCS   = "#B4A7D6"
GROUP_COLORS = [CONTROL, TBHP, BMSCS]
INK = "#20313F"
MUTED = "#6B7A88"

# Condition matrix shared by every panel (Control / TBHP / TBHP+BMSCs).
COND = {"TBHP": ["–", "+", "+"], "BMSCs": ["–", "–", "+"]}

PW, PH = 3.4, 3.2          # nominal panel box
BAR_AREA_H = 1.9           # bars scaled into this height


def bar_panel(panel):
    ax = panel["yAxis"]
    ymin, ymax = float(ax["min"]), float(ax["max"])
    span = (ymax - ymin) or 1.0
    groups = panel["groups"]
    g = VGroup()

    axis = Line([0, 0, 0], [0, BAR_AREA_H, 0], color=INK, stroke_width=2)
    baseline = Line([0, 0, 0], [PW - 0.7, 0, 0], color=INK, stroke_width=2)
    g.add(axis, baseline)

    for i in range(5):
        val = ymin + span * i / 4
        y = BAR_AREA_H * i / 4
        g.add(Line([-0.05, y, 0], [0.05, y, 0], color=INK, stroke_width=2.0))
        g.add(Text(f"{val:g}", font=FONT, color=INK, weight=BOLD).scale(0.299)
              .next_to([0, y, 0], LEFT, buff=0.1))

    ytitle = Text(f"{ax['title']} ({ax['unit']})", font=FONT, color=INK, weight=BOLD).scale(0.345)
    ytitle.rotate(PI / 2).next_to(g, LEFT, buff=0.12)
    g.add(ytitle)

    n = len(groups)
    slot = (PW - 0.9) / n
    bar_w = slot * 0.66
    bars = VGroup()
    tops = []  # (x, topY) for bracket placement
    extras = VGroup()
    for i, grp in enumerate(groups):
        v = float(grp["mean"])
        h = max(0.02, (v - ymin) / span * BAR_AREA_H)
        x = 0.75 + slot * (i + 0.5)
        bar = Rectangle(width=bar_w, height=h, fill_color=GROUP_COLORS[i],
                        fill_opacity=1.0, stroke_color=INK, stroke_width=1.1)
        bar.move_to([x, h / 2, 0])
        bars.add(bar)
        err = float(grp.get("errorHalf") or 0)
        eh = err / span * BAR_AREA_H
        if err > 0:
            cap = 0.06
            extras.add(
                Line([x, h - eh, 0], [x, h + eh, 0], color=INK, stroke_width=1.4),
                Line([x - cap, h + eh, 0], [x + cap, h + eh, 0], color=INK, stroke_width=1.4),
                Line([x - cap, h - eh, 0], [x + cap, h - eh, 0], color=INK, stroke_width=1.4),
            )
        tops.append((x, h + eh))

    # significance brackets, stacked above everything
    max_top = max(t[1] for t in tops)
    sig = panel.get("significance", [])
    for k, s in enumerate(sig):
        a, b = s["between"]
        by = max_top + 0.22 + 0.28 * k
        xa, xb = tops[a][0], tops[b][0]
        extras.add(Line([xa, by, 0], [xb, by, 0], color=INK, stroke_width=1.3))
        extras.add(Line([xa, by, 0], [xa, by - 0.07, 0], color=INK, stroke_width=1.3))
        extras.add(Line([xb, by, 0], [xb, by - 0.07, 0], color=INK, stroke_width=1.3))
        extras.add(Text(s["label"], font=FONT, color=INK, weight=BOLD).scale(0.253)
                   .move_to([(xa + xb) / 2, by + 0.14, 0]))

    g.add(bars, extras)

    # x-axis condition matrix
    matrix = VGroup()
    for r, (name, vals) in enumerate(COND.items()):
        row_y = -0.28 - r * 0.26
        matrix.add(Text(name, font=FONT, color=INK, weight=BOLD).scale(0.253)
                   .move_to([0.28, row_y, 0]).align_to([0.05, 0, 0], LEFT))
        for i, sym in enumerate(vals):
            x = 0.75 + slot * (i + 0.5)
            matrix.add(Text(sym, font=FONT, color=INK, weight=BOLD).scale(0.299)
                       .move_to([x, row_y, 0]))
    g.add(matrix)

    tag = Text(panel["id"], font=FONT, color=INK, weight=BOLD).scale(0.483)
    tag.next_to(g, UP, buff=0.08).align_to(g, LEFT).shift(LEFT * 0.35)
    g.add(tag)
    return g, bars


# Blot geometry — MUST mirror make_blot.py so vector labels line up with the
# bands baked into blot.png (image origin is top-left).
BLOT_PNG = "poc/out/fig_src/blot.png"
BLOT_W_UNITS = 2.5
LANE_FX = [0.22, 0.50, 0.78]
ROW_FY = [0.15, 0.38, 0.61, 0.84]
BLOT_ROWS = ["GPX4", "SLC7A11", "ACSL4", "β-actin"]


def blot_panel():
    """Panel G: realistic western blot (blot.png), with vector row labels and
    the condition matrix aligned to the bands baked into the image."""
    g = Group()

    img = ImageMobject(BLOT_PNG)
    img.width = BLOT_W_UNITS
    iw, ih = img.width, img.height
    img.move_to(ORIGIN)
    g.add(img)

    left, right = -iw / 2, iw / 2
    top, bottom = ih / 2, -ih / 2

    def x_at(fx):
        return left + fx * iw

    def y_at(fy):  # fy measured from the top of the image, like the PNG
        return top - fy * ih

    # protein row labels, right-aligned just outside the membrane's left edge
    labels = VGroup()
    for r, name in enumerate(BLOT_ROWS):
        labels.add(Text(name, font=FONT, color=INK, weight=BOLD).scale(0.276)
                   .next_to([left, y_at(ROW_FY[r]), 0], LEFT, buff=0.1))
    g.add(labels)

    # condition matrix below the blot, lanes aligned to LANE_FX
    matrix = VGroup()
    for r, (name, vals) in enumerate(COND.items()):
        row_y = bottom - 0.2 - r * 0.28
        matrix.add(Text(name, font=FONT, color=INK, weight=BOLD).scale(0.253)
                   .next_to([left, row_y, 0], LEFT, buff=0.1))
        for i, sym in enumerate(vals):
            matrix.add(Text(sym, font=FONT, color=INK, weight=BOLD).scale(0.299)
                       .move_to([x_at(LANE_FX[i]), row_y, 0]))
    g.add(matrix)

    tag = Text("G", font=FONT, color=INK, weight=BOLD).scale(0.483)
    tag.next_to(g, UP, buff=0.08).align_to(g, LEFT)
    g.add(tag)
    return g


class Fig3(Scene):
    def construct(self):
        header = VGroup(
            Text("BMSCs inhibit TBHP-induced ferroptosis", font=FONT,
                 color=INK, weight=BOLD).scale(0.437),
            Text("Fig. 3 · recreated from data recovered from the published figure (mean ± SD, n = 3)",
                 font=FONT, color=MUTED).scale(0.241),
        ).arrange(DOWN, buff=0.07).to_edge(UP, buff=0.25)

        A, barsA = bar_panel(PANELS["A"])
        B, barsB = bar_panel(PANELS["B"])
        C, barsC = bar_panel(PANELS["C"])
        D, barsD = bar_panel(PANELS["D"])
        E, barsE = bar_panel(PANELS["E"])
        F, barsF = bar_panel(PANELS["F"])
        H, barsH = bar_panel(PANELS["H"])
        I, barsI = bar_panel(PANELS["I"])
        J, barsJ = bar_panel(PANELS["J"])
        G = blot_panel()
        all_bars = [barsA, barsB, barsC, barsD, barsE, barsF, barsH, barsI, barsJ]

        row1 = VGroup(A, B, C).arrange(RIGHT, buff=0.6, aligned_edge=DOWN)
        row2 = VGroup(D, E, F).arrange(RIGHT, buff=0.6, aligned_edge=DOWN)
        row3 = Group(G, H, I, J).arrange(RIGHT, buff=0.5, aligned_edge=DOWN)
        grid = Group(row1, row2, row3).arrange(DOWN, buff=0.5, aligned_edge=LEFT)

        fit = min(13.8 / grid.width, 6.2 / grid.height)
        grid.scale(fit).next_to(header, DOWN, buff=0.22)

        self.play(FadeIn(header, shift=DOWN * 0.15), run_time=0.5)
        for bars in all_bars:
            for b in bars:
                b.save_state()
                b.stretch_to_fit_height(0.001, about_edge=DOWN)
        self.play(FadeIn(grid), run_time=0.4)
        self.play(*[Restore(b) for bars in all_bars for b in bars],
                  run_time=1.5, rate_func=rate_functions.ease_out_cubic)
        self.wait(1.3)
