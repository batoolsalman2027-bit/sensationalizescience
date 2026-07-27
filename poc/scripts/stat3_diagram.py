"""
Route A (spec §3.5): the STAT3 signaling mechanism as a node-edge pathway
diagram — NOT generative video. Standard molecular-biology grammar: pointed
arrow = activation, bar-ended connector = inhibition, circled P =
phosphorylation, compartment bands = membrane / cytoplasm / nucleus. Bold,
legible, correct. Matches the recreated-figure aesthetic (light bg, INK text).

Render: manim -qh --format=mp4 poc/scripts/stat3_diagram.py STAT3
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
config.background_color = "#FBFCFE"

INK = "#20313F"
MUTED = "#6B7A88"
NODE = "#9DC3E6"
ACT = "#E0A93B"    # phosphorylation / activation
INH = "#D5573B"    # inhibition
GREEN = "#5FA88C"


def node(label, color=NODE, w=1.7, h=0.7):
    box = RoundedRectangle(width=w, height=h, corner_radius=0.14,
                           fill_color=color, fill_opacity=1.0, stroke_color=INK, stroke_width=1.5)
    txt = Text(label, font=FONT, weight=BOLD, color=INK).scale(0.26)
    txt.move_to(box.get_center())
    return VGroup(box, txt)


def phos(target):
    c = Circle(radius=0.16, fill_color=ACT, fill_opacity=1.0, stroke_color=INK, stroke_width=1.2)
    p = Text("P", font=FONT, weight=BOLD, color=INK).scale(0.22)
    g = VGroup(c, p).move_to(target.get_corner(UR) + np.array([-0.05, 0.05, 0]))
    return g


class STAT3(Scene):
    def construct(self):
        header = Text("JAK2 / STAT3 signaling — suppressed by BMSCs",
                      font=FONT, weight=BOLD, color=INK).scale(0.34).to_edge(UP, buff=0.4)

        # compartment bands
        cyto = Rectangle(width=13.0, height=4.2, fill_color="#EAF1F7", fill_opacity=1.0, stroke_width=0).move_to([0, 0.1, 0])
        nuc = RoundedRectangle(width=8.5, height=1.8, corner_radius=0.3, fill_color="#E7E0EF",
                               fill_opacity=1.0, stroke_color=INK, stroke_width=1.2).move_to([0, -2.7, 0])
        memb = Rectangle(width=13.0, height=0.35, fill_color="#CFE0EC", fill_opacity=1.0, stroke_width=0).move_to([0, 2.3, 0])
        lbl_m = Text("membrane", font=FONT, color=MUTED).scale(0.18).next_to(memb, LEFT, buff=0.15)
        lbl_c = Text("cytoplasm", font=FONT, color=MUTED).scale(0.18).move_to([-5.6, 1.4, 0])
        lbl_n = Text("nucleus", font=FONT, color=MUTED).scale(0.18).next_to(nuc, DOWN, buff=0.12)

        self.play(FadeIn(header), FadeIn(cyto), FadeIn(memb), FadeIn(nuc),
                  FadeIn(lbl_m), FadeIn(lbl_c), FadeIn(lbl_n), run_time=0.6)

        jak = node("JAK2", NODE).move_to([-3.2, 1.9, 0])
        stat = node("STAT3", NODE).move_to([-3.2, 0.4, 0])
        a1 = Arrow(jak.get_bottom(), stat.get_top(), color=INK, buff=0.08, stroke_width=3, max_tip_length_to_length_ratio=0.3)
        self.play(FadeIn(jak), GrowArrow(a1), FadeIn(stat), run_time=0.7)

        p1 = phos(stat)
        self.play(FadeIn(p1, scale=0.5), run_time=0.4)

        # dimerize
        stat2 = node("STAT3", NODE).move_to([-1.5, 0.4, 0])
        p2 = phos(stat2)
        self.play(FadeIn(stat2), FadeIn(p2, scale=0.5), run_time=0.4)
        dimer = VGroup(stat.copy(), stat2.copy())
        self.play(stat.animate.move_to([-2.55, -0.4, 0]), stat2.animate.move_to([-2.05, -0.4, 0]),
                  p1.animate.shift([0.65, -0.8, 0]), p2.animate.shift([-0.55, -0.8, 0]), run_time=0.6)

        # translocate to nucleus (dashed arrow)
        tarrow = DashedLine([-2.3, -0.85, 0], [-2.0, -2.0, 0], color=INK, stroke_width=3, dash_length=0.12)
        tip = Triangle(color=INK, fill_color=INK, fill_opacity=1).scale(0.12).rotate(PI).move_to([-2.0, -2.05, 0])
        self.play(Create(tarrow), FadeIn(tip),
                  VGroup(stat, stat2, p1, p2).animate.move_to([-2.0, -2.7, 0]).scale(0.85), run_time=0.8)

        # target genes light up
        g1 = node("GPX4", GREEN, w=1.5).move_to([0.7, -2.7, 0])
        g2 = node("SLC7A11", GREEN, w=1.9).move_to([2.7, -2.7, 0])
        self.play(FadeIn(g1, scale=0.7), FadeIn(g2, scale=0.7), run_time=0.6)
        self.wait(0.5)

        # BMSC inhibition: bar-ended connector onto JAK2->STAT3, cascade dims
        bmsc = node("BMSCs", "#F4C6DD", w=1.9).move_to([1.2, 2.6, 0])
        inh_line = Line(bmsc.get_bottom(), [-2.9, 1.15, 0], color=INH, stroke_width=4)
        bar = Line([-3.15, 1.15, 0], [-2.65, 1.15, 0], color=INH, stroke_width=6)  # blunt end ⊣
        self.play(FadeIn(bmsc), Create(inh_line), Create(bar), run_time=0.7)
        self.play(
            VGroup(jak, stat, stat2, p1, p2, a1, tarrow, tip, g1, g2).animate.set_opacity(0.25),
            run_time=0.9)
        self.wait(1.0)
