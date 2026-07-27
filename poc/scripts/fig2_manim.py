"""
PoC: recreation of Fig 2 (in-vivo outcomes) B & D from the DIGITIZED data,
matched to the Fig 3 aesthetic (same INK/muted palette, rotated y-titles,
error whiskers, p-value brackets, condition matrix), 16:9.

Panels: B = MRI (Thompson) grade, D = H&E histological score. Five groups with
the Model / Gelmatrix / BMSCs condition matrix. Bar heights and p-labels are the
recovered data (chart values vision-estimated; QC'd per policy).

Render: manim -qh --format=mp4 poc/scripts/fig2_manim.py Fig2
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

DATA = json.loads(Path("poc/out/fig2-digitized.json").read_text())
PANELS = {p["id"]: p for p in DATA["panels"]}

INK = "#20313F"
MUTED = "#6B7A88"
# five-group palette echoing the paper (CON blue → treated grey)
GROUP_COLORS = ["#9DC3E6", "#F4C6DD", "#B4A7D6", "#A6E3D7", "#C9CDD2"]

# in-vivo condition matrix (5 groups), left→right
COND = {
    "Model":    ["–", "+", "+", "+", "+"],
    "Gelmatrix":["–", "–", "+", "–", "+"],
    "BMSCs":    ["–", "–", "–", "+", "+"],
}

BAR_AREA_H = 1.9
PW = 5.0  # wider box: five groups


def nice_step(mx):
    return 1 if mx <= 5 else 5


def bar_panel(panel):
    ax = panel["yAxis"]
    ymin, ymax = float(ax["min"]), float(ax["max"])
    span = (ymax - ymin) or 1.0
    groups = panel["groups"]
    g = VGroup()

    axis = Line([0, 0, 0], [0, BAR_AREA_H, 0], color=INK, stroke_width=2)
    baseline = Line([0, 0, 0], [PW - 0.7, 0, 0], color=INK, stroke_width=2)
    g.add(axis, baseline)

    step = nice_step(ymax)
    ticks = []
    v = ymin
    while v <= ymax + 1e-6:
        ticks.append(v)
        v += step
    for val in ticks:
        y = BAR_AREA_H * (val - ymin) / span
        g.add(Line([-0.05, y, 0], [0.05, y, 0], color=INK, stroke_width=2.2))
        g.add(Text(f"{val:g}", font=FONT, color=INK, weight=BOLD).scale(0.345)
              .next_to([0, y, 0], LEFT, buff=0.12))

    ytitle = Text(f"{ax['title']} ({ax['unit']})", font=FONT, color=INK, weight=BOLD).scale(0.391)
    ytitle.rotate(PI / 2).next_to(g, LEFT, buff=0.12)
    g.add(ytitle)

    n = len(groups)
    slot = (PW - 0.9) / n
    bar_w = slot * 0.66
    bars = VGroup()
    extras = VGroup()
    tops = []
    for i, grp in enumerate(groups):
        val = float(grp["mean"])
        h = max(0.02, (val - ymin) / span * BAR_AREA_H)
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

    max_top = max(t[1] for t in tops)
    for k, s in enumerate(panel.get("significance", [])):
        a, b = s["between"]
        by = max_top + 0.30 + 0.44 * k
        xa, xb = tops[a][0], tops[b][0]
        extras.add(Line([xa, by, 0], [xb, by, 0], color=INK, stroke_width=1.3))
        extras.add(Line([xa, by, 0], [xa, by - 0.07, 0], color=INK, stroke_width=1.3))
        extras.add(Line([xb, by, 0], [xb, by - 0.07, 0], color=INK, stroke_width=1.3))
        extras.add(Text(s["label"], font=FONT, color=INK, weight=BOLD).scale(0.276)
                   .move_to([(xa + xb) / 2, by + 0.15, 0]))

    g.add(bars, extras)

    matrix = VGroup()
    for r, (name, vals) in enumerate(COND.items()):
        row_y = -0.34 - r * 0.34
        matrix.add(Text(name, font=FONT, color=INK, weight=BOLD).scale(0.299)
                   .move_to([0.28, row_y, 0]).align_to([0.05, 0, 0], LEFT))
        for i, sym in enumerate(vals):
            x = 0.75 + slot * (i + 0.5)
            matrix.add(Text(sym, font=FONT, color=INK, weight=BOLD).scale(0.391).move_to([x, row_y, 0]))
    g.add(matrix)

    tag = Text(panel["id"], font=FONT, color=INK, weight=BOLD).scale(0.598)
    tag.next_to(g, UP, buff=0.08).align_to(g, LEFT).shift(LEFT * 0.35)
    g.add(tag)
    return g, bars


class Fig2(Scene):
    def construct(self):
        header = VGroup(
            Text("BMSCs alleviate disc degeneration in vivo", font=FONT,
                 color=INK, weight=BOLD).scale(0.437),
            Text("Fig. 2 · recreated from data recovered from the published figure (mean ± SD, n = 6)",
                 font=FONT, color=MUTED).scale(0.241),
        ).arrange(DOWN, buff=0.07).to_edge(UP, buff=0.3)

        B, barsB = bar_panel(PANELS["B"])
        D, barsD = bar_panel(PANELS["D"])
        row = VGroup(B, D).arrange(RIGHT, buff=1.3, aligned_edge=DOWN)

        fit = min(13.6 / row.width, 5.6 / row.height)
        row.scale(fit).next_to(header, DOWN, buff=0.35)

        self.play(FadeIn(header, shift=DOWN * 0.15), run_time=0.5)
        for bars in (barsB, barsD):
            for b in bars:
                b.save_state()
                b.stretch_to_fit_height(0.001, about_edge=DOWN)
        self.play(FadeIn(row), run_time=0.4)
        self.play(*[Restore(b) for bars in (barsB, barsD) for b in bars],
                  run_time=1.5, rate_func=rate_functions.ease_out_cubic)
        self.wait(1.3)
