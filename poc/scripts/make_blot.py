"""
Generate a realistic schematic western blot (panel G) from the digitized folds.

Band darkness = protein level (GPX4<-H, SLC7A11<-I, ACSL4<-J, beta-actin=loading
control). Uses soft Gaussian bands + membrane mottle + fine grain so it reads like
a real chemiluminescent exposure rather than flat rectangles. Still a schematic:
intensities come from the quantified data, not from digitizing the raw blot.

Out: poc/out/fig_src/blot.png  (grayscale). Geometry (lane/row fractions) is
mirrored in fig3_manim.py so labels line up.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

DATA = json.loads(Path("poc/out/fig3-digitized.json").read_text())
P = {p["id"]: p for p in DATA["panels"]}
def folds(pid): return [float(x["mean"]) for x in P[pid]["groups"]]

PROTEINS = [("GPX4", folds("H")), ("SLC7A11", folds("I")),
            ("ACSL4", folds("J")), ("b-actin", [1.0, 1.0, 1.0])]

W, H = 900, 640
LANE_FX = [0.22, 0.50, 0.78]
ROW_FY = [0.15, 0.38, 0.61, 0.84]
BAND_W = int(0.19 * W)
BAND_H = int(0.052 * H)

rng = np.random.default_rng(7)
# Membrane: faintly mottled light-gray exposure.
base = 0.90 + 0.018 * gaussian_filter(rng.standard_normal((H, W)), sigma=9)

xs = np.arange(W)[None, :]
ys = np.arange(H)[:, None]
dark = np.zeros((H, W))
for r, (_name, vals) in enumerate(PROTEINS):
    yc = ROW_FY[r] * H
    vmax = max(vals) or 1.0
    for i, v in enumerate(vals):
        inten = float(np.clip(v / vmax, 0.08, 1.0))
        xc = LANE_FX[i] * W
        sy = BAND_H * (0.6 + 0.5 * inten)          # stronger bands a touch thicker
        halfw = BAND_W * (0.5 + 0.08 * inten)
        jitter_y = rng.normal(0, 1.5)               # slight organic waver
        vprof = np.exp(-((ys - yc - jitter_y) ** 2) / (2 * sy ** 2))
        dx = np.abs(xs - xc)
        edge = np.clip((halfw - dx) / (0.20 * BAND_W), 0, 1)
        hprof = edge * edge * (3 - 2 * edge)        # smoothstep soft lane edges
        dark += inten * vprof * hprof

dark = gaussian_filter(dark, sigma=2.4)
dark = np.clip(dark, 0, 1)
img = base * (1 - 0.93 * dark)
img += 0.010 * rng.standard_normal((H, W))          # fine film grain
img = np.clip(img, 0, 1)

Image.fromarray((img * 255).astype(np.uint8), mode="L").save("poc/out/fig_src/blot.png")
print("wrote poc/out/fig_src/blot.png", W, "x", H)
