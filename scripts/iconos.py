"""Dibuja los iconos de la app: un bloque de hierba en perspectiva sobre el cielo.

Uso: python3 scripts/iconos.py  (escribe los PNG en public/)
"""
import random
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'public'
rng = random.Random(7)

GRASS = [(90, 168, 50), (104, 184, 58), (78, 150, 44), (116, 194, 70)]
DIRT = [(139, 90, 53), (122, 78, 45), (156, 104, 64), (108, 68, 40)]


def texture(kind):
    """Textura de 16x16 como la del juego."""
    t = [[None] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            if kind == 'top':
                t[y][x] = rng.choice(GRASS)
            else:
                drip = 3 + (1 if rng.random() < 0.45 else 0) + (1 if rng.random() < 0.2 else 0)
                t[y][x] = rng.choice(GRASS) if y < drip else rng.choice(DIRT)
    # Que las gotas de hierba sean columnas: rehacer por columnas.
    if kind == 'side':
        for x in range(16):
            drip = 3 + rng.choice([0, 0, 1, 1, 2])
            for y in range(16):
                t[y][x] = rng.choice(GRASS) if y < drip else rng.choice(DIRT)
    return t


def shade(c, f):
    return tuple(max(0, min(255, round(v * f))) for v in c)


def draw_block(size):
    """Bloque isométrico a baja resolución (size x size), fondo transparente."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    s = size / 64
    top, side = texture('top'), texture('side')
    faces = [
        # (origen, eje u, eje v, textura, brillo)
        ((32 * s, 4 * s), (27 * s, 13.5 * s), (-27 * s, 13.5 * s), top, 1.0),
        ((5 * s, 17.5 * s), (27 * s, 13.5 * s), (0, 29 * s), side, 0.82),
        ((32 * s, 31 * s), (27 * s, -13.5 * s), (0, 29 * s), side, 0.64),
    ]
    px = img.load()
    for (ox, oy), (ax, ay), (bx, by), tex, light in faces:
        det = ax * by - ay * bx
        for y in range(size):
            for x in range(size):
                dx, dy = x + 0.5 - ox, y + 0.5 - oy
                u = (dx * by - dy * bx) / det
                v = (ax * dy - ay * dx) / det
                if 0 <= u < 1 and 0 <= v < 1:
                    px[x, y] = shade(tex[int(v * 16)][int(u * 16)], light) + (255,)
    return img


def sky(size, radius):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    grad = Image.new('RGBA', (size, size))
    g = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        g.line([(0, y), (size, y)], fill=(round(126 + 60 * t), round(200 + 30 * t), round(240 + 10 * t), 255))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    bg.paste(grad, (0, 0), mask)
    return bg


def icon(size, block_part, rounded):
    base = sky(size, round(size * 0.22) if rounded else 0)
    low = draw_block(64)
    b = round(size * block_part)
    block = low.resize((b, b), Image.NEAREST)
    base.alpha_composite(block, ((size - b) // 2, (size - b) // 2 + round(size * 0.02)))
    return base


OUT.mkdir(exist_ok=True)
icon(192, 0.72, True).save(OUT / 'icono-192.png')
icon(512, 0.72, True).save(OUT / 'icono-512.png')
# Para Android: ocupa todo el cuadrado y el bloque queda dentro de la zona segura.
icon(512, 0.56, False).save(OUT / 'icono-maskable-512.png')
# Para iPhone: sin transparencia, iOS ya redondea las esquinas.
icon(180, 0.66, False).convert('RGB').save(OUT / 'apple-touch-icon.png')
icon(64, 0.8, True).save(OUT / 'favicon.png')
print('Iconos en', OUT)
