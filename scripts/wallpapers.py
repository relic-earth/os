#!/usr/bin/env python3
"""
WALLPAPERS — the five theme backgrounds, rendered as ASCII art.

Each scene is drawn as a luminance field (plus an accent mask) at character-cell
resolution, then typeset glyph by glyph in the theme's colours:

  sith    the Chancellor's window over Coruscant at dusk     red on black
  earth   the Enclave on the grass plains of Dantooine       white + green on Republic blue-black
  savile  a Savile Row shopfront at night, in the rain       brass + jade on bottle green
  stark   an armoured faceplate as a holographic wireframe   amber + cyan on black
  canon   a 1972-style subway diagram                        black + one red line on paper

Output: public/wallpaper/<theme>.jpg (2560x1440). Usage: python3 scripts/wallpapers.py [theme…]
Needs Pillow + numpy and DejaVu Sans Mono.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 2560, 1440
CW, CH = 10, 18  # character cell
COLS, ROWS = W // CW, H // CH
RAMP = " .'`,:;-~=+*>xo#%&@"
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 15)
OUT = Path(__file__).resolve().parent.parent / 'public' / 'wallpaper'

# cell-centre coordinates: x in [0, 16/9], y in [0, 1] (y down)
ys, xs = np.mgrid[0:ROWS, 0:COLS].astype(np.float32)
X = (xs + 0.5) / COLS * (16 / 9)
Y = (ys + 0.5) / ROWS
rng = np.random.default_rng(7)


def noise(scale, seed, octaves=4):
    """Smooth value noise at cell resolution."""
    r = np.random.default_rng(seed)
    out = np.zeros_like(X)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = max(2, int(scale * 2**o))
        g = r.random((n + 1, int(n * 16 / 9) + 2))
        gy = Y * n
        gx = X * n
        y0, x0 = np.floor(gy).astype(int), np.floor(gx).astype(int)
        fy, fx = gy - y0, gx - x0
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a, b = g[y0, x0], g[y0, x0 + 1]
        c, d = g[y0 + 1, x0], g[y0 + 1, x0 + 1]
        out += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy)
        tot += amp
        amp *= 0.5
    return out / tot


def line_dist(px, py, ax, ay, bx, by):
    """Distance from each cell to the segment a–b."""
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return np.hypot(px - ax - t * dx, py - ay - t * dy)


def typeset(lum, accent, bg, ink, ink2, glow=0.0, paper=False, accent_ramp=None):
    """Lay glyphs over the cells. lum, accent in [0,1]."""
    lum = np.clip(lum, 0, 1)
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    bg_a, ink_a, ink2_a = (np.array(c, dtype=np.float32) for c in (bg, ink, ink2))
    for r in range(ROWS):
        for c in range(COLS):
            v = lum[r, c]
            if v < 0.035:
                continue
            ch = RAMP[min(len(RAMP) - 1, int(v * len(RAMP)))]
            a = accent[r, c]
            if a > 0.5 and accent_ramp:
                ch = accent_ramp[(r * 7 + c * 3) % len(accent_ramp)]
            col = ink2_a if a > 0.5 else ink_a
            k = 0.35 + 0.65 * v
            rgb = bg_a + (col - bg_a) * k
            d.text((c * CW, r * CH - 1), ch, font=FONT, fill=tuple(int(x) for x in rgb))
    if glow:
        from PIL import ImageFilter
        blur = img.filter(ImageFilter.GaussianBlur(9))
        img = Image.blend(img, Image.fromarray(np.maximum(np.asarray(img), np.asarray(blur)).astype(np.uint8)), glow)
    return img


# ─── SITH ─────────────────────────────────────────────────────────────────
def sith():
    horizon = 0.66
    sky = 0.12 + np.clip(1 - np.abs(Y - horizon) / 0.62, 0, 1) ** 1.3 * 0.8
    sun = np.exp(-(((X - 0.95) / 0.32) ** 2 + ((Y - horizon) / 0.12) ** 2)) * 0.6
    lum = sky + sun + (noise(3, 1) - 0.5) * 0.18 * (Y < horizon)
    acc = np.zeros_like(X)
    # three depths of towers
    for depth, (base, hmin, hmax, step, shade, seed) in enumerate(
        [(0.70, 0.04, 0.16, 0.012, 0.3, 3), (0.80, 0.08, 0.26, 0.02, 0.1, 11), (0.95, 0.10, 0.42, 0.045, 0.0, 29)]
    ):
        r = np.random.default_rng(seed)
        x = -0.02
        while x < 16 / 9:
            w = step * (0.7 + r.random() * 1.6)
            h = hmin + r.random() * (hmax - hmin) * (1.8 if r.random() > 0.9 else 1)
            m = (X >= x) & (X < x + w) & (Y > base - h)
            lum = np.where(m, shade, lum)
            lit = m & (r.random(X.shape) > (0.9 - depth * 0.03)) & ((ys.astype(int) % 3) == 0)
            lum = np.where(lit, 0.6 + depth * 0.15, lum)
            if r.random() > 0.72:  # spire with a beacon
                sx = x + w / 2
                sm = (np.abs(X - sx) < 0.004) & (Y > base - h - 0.05) & (Y <= base - h)
                lum = np.where(sm, shade + 0.1, lum)
                acc = np.where((np.abs(X - sx) < 0.004) & (np.abs(Y - (base - h - 0.05)) < 0.008), 1, acc)
                lum = np.where(acc > 0, 1, lum)
            x += w + r.random() * step * 0.6
    # traffic lanes
    for ly, n in [(0.47, 40), (0.52, 32), (0.57, 36)]:
        dots = rng.random(n) * 16 / 9
        for dx in dots:
            m = (np.abs(Y - ly - (rng.random() - 0.5) * 0.01) < 0.006) & (np.abs(X - dx) < 0.006)
            lum = np.where(m, 0.95, lum)
    # the window's mullions
    mull = (np.abs(X - 0.595) < 0.006) | (np.abs(X - 1.19) < 0.006) | (np.abs(Y - 0.095) < 0.006)
    lum = np.where(mull, 0, lum)
    lum *= 1 - 0.55 * np.clip((Y - 0.85) / 0.15, 0, 1)
    return typeset(lum, acc, (8, 2, 3), (235, 40, 34), (255, 196, 140), glow=0.35, accent_ramp='*')


# ─── EARTH ────────────────────────────────────────────────────────────────
def earth():
    lum = np.clip(0.55 - Y * 0.7, 0, 1) * 0.6 + (noise(2.5, 5) - 0.5) * 0.25 * (Y < 0.6)
    acc = np.zeros_like(X)
    # three moons / one pale planet
    p = np.hypot(X - 1.38, Y - 0.2)
    lum = np.where(p < 0.11, 0.75 - p * 3 + noise(8, 6) * 0.25, lum)
    lum = np.where(np.abs(p - 0.11) < 0.004, 0.95, lum)
    # rolling hills of grass
    hills = []
    for i, (base, amp, freq, ph, sh) in enumerate([(0.6, 0.03, 2.1, 0.3, 0.42), (0.68, 0.04, 1.4, 1.7, 0.6), (0.79, 0.05, 0.9, 4.0, 0.82)]):
        top = base - amp * np.sin(X * freq * np.pi + ph) - noise(6, 20 + i, 2) * 0.02
        m = Y > top
        grass = sh * (0.75 + 0.5 * noise(18, 30 + i, 2)) * (0.85 + 0.15 * np.sin(X * 140 + Y * 40))
        lum = np.where(m, grass, lum)
        acc = np.where(m, 1, acc)
        hills.append(top)
    # the Enclave: a low dome and a central spire on the middle ridge
    ex, ey = 0.62, 0.64
    dome = (((X - ex) / 0.2) ** 2 + ((Y - ey) / 0.11) ** 2 < 1) & (Y < ey)
    lum = np.where(dome, 0.7 + 0.25 * (np.abs(((X - ex) * 40) % 1 - 0.5) > 0.4), lum)
    base = (np.abs(X - ex) < 0.26) & (Y >= ey) & (Y < ey + 0.025)
    lum = np.where(base, 0.95, lum)
    acc = np.where(base, 0, acc)
    acc = np.where(dome, 0, acc)
    for dx, h in [(0, 0.24), (-0.14, 0.1), (0.14, 0.1)]:
        sp = (np.abs(X - ex - dx) < 0.012 - (ey - Y) * 0.04) & (Y > ey - h) & (Y < ey)
        lum = np.where(sp, 0.92, lum)
        acc = np.where(sp, 0, acc)
    # lone trees
    for tx, ty, s in [(0.18, 0.62, 1.0), (1.55, 0.7, 1.3), (1.62, 0.715, 0.8)]:
        crown = np.hypot((X - tx) / 1.6, Y - ty + 0.06 * s) < 0.035 * s
        trunk = (np.abs(X - tx) < 0.004) & (Y > ty - 0.05 * s) & (Y < ty + 0.01)
        lum = np.where(crown | trunk, 0.2, lum)
    lum *= 1 - 0.4 * np.clip((Y - 0.88) / 0.12, 0, 1)
    return typeset(lum, acc, (3, 9, 22), (236, 244, 240), (96, 238, 128), glow=0.3)


# ─── SAVILE ───────────────────────────────────────────────────────────────
def savile():
    lum = noise(4, 9) * 0.12
    acc = np.zeros_like(X)
    cx = 16 / 18
    # stone frontage, shop window with an arched head
    win_l, win_r, win_t, win_b = cx - 0.42, cx + 0.42, 0.18, 0.66
    arch = ((X - cx) / 0.42) ** 2 + ((Y - win_t) / 0.1) ** 2 < 1
    window = ((X > win_l) & (X < win_r) & (Y > win_t) & (Y < win_b)) | (arch & (Y <= win_t))
    glow = 0.55 + 0.3 * np.exp(-(((X - cx) / 0.3) ** 2 + ((Y - 0.4) / 0.25) ** 2))
    lum = np.where(window, glow * (0.85 + 0.15 * noise(20, 4, 2)), lum)
    # glazing bars
    bars = window & ((np.abs(X - cx) < 0.005) | (np.abs(X - (cx - 0.21)) < 0.004) | (np.abs(X - (cx + 0.21)) < 0.004) | (np.abs(Y - 0.42) < 0.005))
    lum = np.where(bars, 0.15, lum)
    # a tailor's dummy and a bolt of cloth in the window
    dummy = (((X - (cx - 0.1)) / 0.07) ** 2 + ((Y - 0.44) / 0.12) ** 2 < 1) | ((np.abs(X - (cx - 0.1)) < 0.006) & (Y > 0.5) & (Y < 0.64))
    head = np.hypot(X - (cx - 0.1), Y - 0.29) < 0.025
    lum = np.where(dummy | head, 0.22, lum)
    lapel = dummy & (np.abs(np.abs(X - (cx - 0.1)) - (Y - 0.34) * 0.35) < 0.006)
    lum = np.where(lapel, 0.95, lum)
    bolt = (np.abs(X - (cx + 0.16)) < 0.07) & (Y > 0.52) & (Y < 0.64)
    lum = np.where(bolt, 0.4 + 0.25 * (np.sin(Y * 260) > 0), lum)
    # gilt fascia lettering band
    fascia = (X > win_l - 0.05) & (X < win_r + 0.05) & (np.abs(Y - 0.06) < 0.025)
    lum = np.where(fascia, 0.35, lum)
    letters = fascia & (np.sin(X * 210) > 0.2) & (np.abs(Y - 0.06) < 0.013) & (np.abs(X - cx) < 0.3)
    lum = np.where(letters, 1, lum)
    acc = np.where(letters, 1, acc)
    # pavement with reflections
    pave = Y > 0.72
    refl = np.exp(-(((X - cx) / 0.36) ** 2)) * np.clip(1 - (Y - 0.72) / 0.28, 0, 1) * (0.5 + 0.5 * np.sin(Y * 300 + noise(10, 3) * 8))
    lum = np.where(pave, 0.08 + refl * 0.55, lum)
    acc = np.where(pave & (refl > 0.2), 1, acc)
    # rain
    rain = (rng.random(X.shape) > 0.965) & ~window
    lum = np.where(rain, np.maximum(lum, 0.35), lum)
    typeset_rain = np.where(rain, 1, 0)
    img = typeset(lum, np.maximum(acc, typeset_rain * 0), (6, 22, 16), (214, 178, 104), (92, 200, 160), glow=0.35)
    # overlay rain as slanted strokes
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(12)
    for _ in range(900):
        x, y = r.random() * W, r.random() * H
        d.text((x, y), '/', font=FONT, fill=(92, 170, 140) if r.random() > 0.5 else (150, 130, 80))
    return img


# ─── STARK ────────────────────────────────────────────────────────────────
def stark():
    cx, cy = 16 / 18, 0.5
    u, v = (X - cx) / 0.3, (Y - cy) / 0.42
    lum = noise(5, 2) * 0.05
    acc = np.zeros_like(X)
    # faceplate silhouette: rounded top, tapering jaw
    half = np.where(v < 0, np.sqrt(np.clip(1 - v**2, 0, 1)), 1 - 0.45 * v**1.6)
    inside = (np.abs(u) < half) & (v > -1) & (v < 1)
    edge = np.abs(np.abs(u) - half) < 0.03
    # wireframe: horizontal contours bent over the form, vertical meridians
    depth = np.sqrt(np.clip(1 - (u / np.maximum(half, 1e-3)) ** 2, 0, 1))
    contour = np.abs(((v + 0.08 * depth) * 14) % 1 - 0.5) > 0.44
    meridian = np.abs(((u / np.maximum(half, 1e-3)) * 7) % 1 - 0.5) > 0.45
    lum = np.where(inside & (contour | meridian), 0.35 + 0.35 * depth, lum)
    lum = np.where(inside & edge | (edge & (v > -1) & (v < 1)), 0.95, lum)
    # eye slits
    for sx in (-1, 1):
        eye = (np.abs(v + 0.12 - 0.12 * np.abs(u)) < 0.045) & (np.abs(u - sx * 0.42) < 0.26)
        lum = np.where(eye, 1, lum)
        acc = np.where(eye, 1, acc)
    # mouth plate seam + brow line
    seam = inside & ((np.abs(v - 0.42) < 0.012) & (np.abs(u) < 0.55) | (np.abs(v + 0.4) < 0.01) & (np.abs(u) < 0.75))
    lum = np.where(seam, 0.9, lum)
    # HUD rings and readouts around it
    rr = np.hypot((X - cx) / 1.0, Y - cy)
    for rad, w in [(0.47, 0.003), (0.5, 0.002), (0.56, 0.0015)]:
        ring = (np.abs(rr - rad) < w * 3) & (np.sin(np.arctan2(Y - cy, X - cx) * 36) > -0.2)
        lum = np.where(ring, 0.6, lum)
        acc = np.where(ring, 1, acc)
    ticks = (np.abs(rr - 0.6) < 0.01) & (np.sin(np.arctan2(Y - cy, X - cx) * 120) > 0.7)
    lum = np.where(ticks, 0.55, lum)
    # grid floor of data columns at the sides
    side = ((X < 0.25) | (X > 16 / 9 - 0.25)) & (rng.random(X.shape) > 0.55) & ((xs.astype(int) % 3) == 0)
    lum = np.where(side, 0.25 + rng.random(X.shape) * 0.3, lum)
    acc = np.where(side & (rng.random(X.shape) > 0.7), 1, acc)
    return typeset(lum, acc, (4, 4, 6), (255, 186, 64), (110, 214, 255), glow=0.45)


# ─── CANON ────────────────────────────────────────────────────────────────
def canon():
    lum = np.zeros_like(X)
    acc = np.zeros_like(X)
    th = 0.0055
    lines = [
        [(0.1, 0.12), (0.45, 0.12), (0.7, 0.37), (0.7, 0.92)],
        [(0.25, 0.05), (0.25, 0.45), (0.6, 0.8), (1.3, 0.8), (1.45, 0.95)],
        [(0.05, 0.55), (0.55, 0.55), (0.9, 0.2), (1.7, 0.2)],
        [(0.4, 0.95), (0.4, 0.7), (1.0, 0.1), (1.0, 0.02)],
        [(1.15, 0.05), (1.15, 0.6), (1.4, 0.6), (1.7, 0.9)],
        [(0.85, 0.98), (0.85, 0.66), (1.6, 0.66), (1.6, 0.45), (1.75, 0.45)],
    ]
    for li, pts in enumerate(lines):
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            m = line_dist(X, Y, ax, ay, bx, by) < th
            lum = np.where(m, 0.9, lum)
    # the one red line
    red = [(0.0, 0.33), (0.5, 0.33), (0.82, 0.65), (1.78, 0.65)]
    for (ax, ay), (bx, by) in zip(red, red[1:]):
        m = line_dist(X, Y, ax, ay, bx, by) < th * 1.2
        lum = np.where(m, 1, lum)
        acc = np.where(m, 1, acc)
    # stations: white dots ringed in black at a few nodes
    for sx, sy in [(0.45, 0.12), (0.25, 0.33), (0.55, 0.55), (0.7, 0.65), (1.0, 0.65), (1.15, 0.2), (1.3, 0.8), (0.85, 0.66), (1.6, 0.66), (1.15, 0.6)]:
        d = np.hypot(X - sx, Y - sy)
        lum = np.where(d < 0.022, 1, lum)
        acc = np.where(d < 0.022, 0, acc)
        lum = np.where(d < 0.013, 0, lum)
    # faint water / park masses
    water = noise(1.5, 41) > 0.62
    lum = np.where((lum == 0) & water & ((xs.astype(int) + ys.astype(int)) % 4 == 0), 0.12, lum)
    return typeset(lum, acc, (242, 238, 228), (16, 16, 16), (226, 35, 26), accent_ramp='#')


SCENES = {'sith': sith, 'earth': earth, 'savile': savile, 'stark': stark, 'canon': canon}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name in sys.argv[1:] or SCENES:
        img = SCENES[name]()
        img.save(OUT / f'{name}.jpg', quality=82, optimize=True, progressive=True)
        print(name, (OUT / f'{name}.jpg').stat().st_size // 1024, 'KB')
