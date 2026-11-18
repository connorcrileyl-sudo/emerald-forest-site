"""Emerald Forest Furnishings: make an on-brand social post from a photo.

Runs anywhere with Python 3 and Pillow (ChatGPT's code tool has both).
The photo is placed as it is; this script only adds a see-through emerald underlay, text,
the logo and icons. It never changes the woodwork.

Examples (run from the folder this file is in):

  python make_post.py photo --photo walnut-stairs.jpg \
      --headline "Walnut Spiral Staircase" \
      --subline "Hand-turned balusters, Black Mountain" --size portrait

  python make_post.py review --quote "Noah has excellent attention to detail." \
      --name "Mike W" --size square

  python make_post.py before-after --before old.jpg --after new.jpg \
      --headline "Alcove to Wine Bar" --size portrait

Sizes: square 1080x1080, portrait 1080x1350 (best for feeds),
story 1080x1920. Output: post.png unless --out is given.
"""

import argparse
import os
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
LOGOS = os.path.join(HERE, "logos")
ICONS = os.path.join(HERE, "icons")

# Brand colours (from the website)
FOREST_BLACK = (6, 9, 7)
# Dark emerald for see-through underlays behind text. Deep enough that
# gold and parchment read on it over any photo, green enough to be on
# brand, and never fully opaque, so the photo shows through.
EMERALD_DARK = (12, 36, 22)  # #0c2416
PARCHMENT = (214, 205, 185)
GOLD_FLAT = (201, 148, 50)
# The lit-gold gradient the site uses on headings, top to bottom.
GOLD_STOPS = [(0, "#dba743"), (0.30, "#c89231"), (0.62, "#a87824"), (0.84, "#bd8d38"), (1, "#926722")]
PHONE = "(828) 424-5401"
WEBSITE = "emeraldforestfurnishings.com"
SIZES = {"square": (1080, 1080), "portrait": (1080, 1350), "story": (1080, 1920)}
MARGIN = 72


def hex_rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def heading_font(size):
    return font("LibreCaslonText-Bold.ttf", size)


def body_font(size, weight=400):
    return font("Jost-Variable.ttf", size, weight)


def gold_gradient(w, h):
    """A vertical image of the site's lit-gold gradient."""
    grad = Image.new("RGB", (1, h))
    stops = [(p, hex_rgb(c)) for p, c in GOLD_STOPS]
    for y in range(h):
        t = y / max(h - 1, 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                k = (t - p0) / (p1 - p0) if p1 > p0 else 0
                grad.putpixel((0, y), tuple(round(a + (b - a) * k) for a, b in zip(c0, c1)))
                break
    return grad.resize((w, h))


def gold_text(canvas, xy, lines, fnt, line_gap=1.12, align="left", width=None):
    """Draw lines in lit gold with the site's crisp dark edge underneath."""
    x, y = xy
    asc, desc = fnt.getmetrics()
    lh = int((asc + desc) * line_gap)
    for line in lines:
        bbox = fnt.getbbox(line)
        tw = bbox[2] - bbox[0]
        lx = x + (width - tw) // 2 if align == "center" and width else x
        mask = Image.new("L", canvas.size, 0)
        ImageDraw.Draw(mask).text((lx, y), line, font=fnt, fill=255)
        # Shadows: 1px-ish crisp edge plus a soft one, scaled for 1080px.
        for dy, blur, alpha in ((3, 2, 150), (6, 16, 90)):
            sh = mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda v, a=alpha: v * a // 255)
            canvas.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, dy), sh)
        grad = gold_gradient(canvas.size[0], asc + desc)
        layer = Image.new("RGB", canvas.size, GOLD_FLAT)
        layer.paste(grad, (0, y))
        canvas.paste(layer, (0, 0), mask)
        y += lh
    return y


def plain_text(draw, xy, lines, fnt, fill, line_gap=1.3, align="left", width=None, tracking=0):
    x, y = xy
    asc, desc = fnt.getmetrics()
    lh = int((asc + desc) * line_gap)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        tw = bbox[2] - bbox[0] + tracking * max(len(line) - 1, 0)
        lx = x + (width - tw) // 2 if align == "center" and width else x
        if tracking:
            cx = lx
            for ch in line:
                draw.text((cx, y), ch, font=fnt, fill=fill)
                cx += draw.textlength(ch, font=fnt) + tracking
        else:
            draw.text((lx, y), line, font=fnt, fill=fill)
        y += lh
    return y


def wrap(text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if fnt.getlength(test) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def balance(lines, fnt, max_w):
    """Re-split wrapped lines so they're similar lengths (no lone word)."""
    words = " ".join(lines).split()
    n = len(lines)
    if n < 2:
        return lines
    best, best_w = lines, max(fnt.getlength(l) for l in lines)
    # Try every split into n lines (headlines are short, so this is cheap).
    def splits(ws, k):
        if k == 1:
            yield [" ".join(ws)]
            return
        for i in range(1, len(ws) - k + 2):
            for rest in splits(ws[i:], k - 1):
                yield [" ".join(ws[:i])] + rest
    for cand in splits(words, n):
        w = max(fnt.getlength(l) for l in cand)
        if w <= max_w and w < best_w:
            best, best_w = cand, w
    return best


def fit_heading(text, max_w, max_lines=3, start=86, smallest=52):
    size = start
    while size >= smallest:
        f = heading_font(size)
        lines = wrap(text, f, max_w)
        if len(lines) <= max_lines:
            return f, balance(lines, f, max_w)
        size -= 4
    f = heading_font(smallest)
    return f, balance(wrap(text, f, max_w), f, max_w)


def cover(img, w, h):
    return ImageOps.fit(ImageOps.exif_transpose(img).convert("RGB"), (w, h), Image.LANCZOS, centering=(0.5, 0.5))


def underlay(canvas, top, full, strength=0.8):
    """See-through dark emerald behind text: clear at `top`, easing in to
    `strength` (0-1) by `full` and held below. The photo stays visible."""
    w, h = canvas.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    top = max(0, top)
    for y in range(top, h):
        t = min(1, (y - top) / max(full - top, 1))
        t = t * t * (3 - 2 * t)  # smoothstep: no visible edge where it starts
        d.line([(0, y), (w, y)], fill=int(255 * strength * t))
    canvas.paste(Image.new("RGB", (w, h), EMERALD_DARK), (0, 0), mask)


def soft_spot(canvas, box, strength=0.55):
    """A soft emerald pool behind a small element (the logo)."""
    w, h = canvas.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).ellipse(box, fill=int(255 * strength))
    canvas.paste(Image.new("RGB", (w, h), EMERALD_DARK), (0, 0), m.filter(ImageFilter.GaussianBlur(60)))


RULE_H = 30  # space the divider takes, including its gap


def rule(canvas, x, y, length=360, strength=0.75):
    """The faint engraved-sign divider: a small four-point gold star with a
    hairline fading out to the right. Drawn at 4x, then scaled down."""
    k = 4
    w, h = (length + 20) * k, 16 * k
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    a = int(255 * strength)
    cx, cy, r, n = 8 * k, h // 2, 8 * k, 1.7 * k
    star = [(cx, cy - r), (cx + n, cy - n), (cx + r, cy), (cx + n, cy + n),
            (cx, cy + r), (cx - n, cy + n), (cx - r, cy), (cx - n, cy - n)]
    d.polygon(star, fill=GOLD_FLAT + (a,))
    x0, x1 = 24 * k, w - 1
    for px in range(x0, x1):
        t = 1 - (px - x0) / (x1 - x0)
        d.line([(px, cy - k // 2), (px, cy + k // 2 - 1)], fill=GOLD_FLAT + (int(a * t),))
    layer = layer.resize((w // k, h // k), Image.LANCZOS)
    canvas.paste(layer, (x, y - 8), layer)


def paste_png(canvas, path, xy, width=None, height=None):
    im = Image.open(path).convert("RGBA")
    if width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    elif height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    canvas.paste(im, xy, im)
    return im.size


def footer(canvas, y, align="left"):
    """Phone icon + number, then the website, in small spaced capitals."""
    w = canvas.size[0]
    d = ImageDraw.Draw(canvas)
    f = body_font(30, 500)
    text = f"{PHONE}   ·   {WEBSITE.upper()}"
    tw = d.textlength(text, font=f) + 2 * len(text)
    x = MARGIN if align == "left" else int((w - tw - 44) / 2)
    paste_png(canvas, os.path.join(ICONS, "phone.png"), (x, y - 2), height=34)
    plain_text(d, (x + 46, y), [text], f, PARCHMENT, tracking=2)


def make_photo(a):
    w, h = SIZES[a.size]
    canvas = cover(Image.open(a.photo), w, h)
    safe_bottom = 250 if a.size == "story" else 0
    hf, hlines = fit_heading(a.headline, w - 2 * MARGIN - 40)
    sf = body_font(38)
    slines = wrap(a.subline, sf, w - 2 * MARGIN) if a.subline else []
    asc, desc = hf.getmetrics()
    text_h = len(hlines) * int((asc + desc) * 1.12) + RULE_H + (len(slines) * 50 + 20 if slines else 0) + 110
    text_top = h - safe_bottom - MARGIN - text_h
    underlay(canvas, text_top - 300, text_top - 10, 0.8)
    y = gold_text(canvas, (MARGIN, text_top), hlines, hf)
    rule(canvas, MARGIN, y + 10)
    y += RULE_H
    if slines:
        y = plain_text(ImageDraw.Draw(canvas), (MARGIN, y + 8), slines, sf, PARCHMENT)
    footer(canvas, y + 34)
    # Logo: one-colour cream version, small, top right, over its own soft shade.
    lw = 170 if a.size != "story" else 190
    top = 250 if a.size == "story" else MARGIN - 20
    soft_spot(canvas, (w - MARGIN - lw - 70, top - 70, w - MARGIN + 70, top + lw + 70))
    paste_png(canvas, os.path.join(LOGOS, "logo-light.png"), (w - MARGIN - lw, top), width=lw)
    return canvas


def make_review(a):
    w, h = SIZES[a.size]
    canvas = Image.new("RGB", (w, h), FOREST_BLACK)
    d = ImageDraw.Draw(canvas)
    # Thin gold frame, inset.
    inset = 40
    d.rectangle((inset, inset, w - inset, h - inset), outline=GOLD_FLAT, width=2)
    top = 250 if a.size == "story" else 150
    star = 64
    gap = 18
    sx = (w - (5 * star + 4 * gap)) // 2
    for i in range(5):
        paste_png(canvas, os.path.join(ICONS, "star.png"), (sx + i * (star + gap), top), height=star)
    qf = body_font(50 if len(a.quote) < 140 else 42)
    qlines = wrap(f"“{a.quote}”", qf, w - 2 * 130)
    y = plain_text(d, (130, top + star + 70), qlines, qf, PARCHMENT, line_gap=1.35, align="center", width=w - 260)
    nf = body_font(30, 600)
    plain_text(d, (0, y + 30), [a.name.upper()], nf, GOLD_FLAT, align="center", width=w, tracking=4)
    lw = 230
    bottom = h - (250 if a.size == "story" else 90) - lw
    paste_png(canvas, os.path.join(LOGOS, "logo.png"), ((w - lw) // 2, bottom), width=lw)
    return canvas


def make_before_after(a):
    w, h = SIZES[a.size]
    canvas = Image.new("RGB", (w, h), FOREST_BLACK)
    hf, hlines = fit_heading(a.headline, w - 2 * MARGIN, max_lines=2, start=72)
    asc, desc = hf.getmetrics()
    text_h = len(hlines) * int((asc + desc) * 1.12) + RULE_H + 24 + 40
    safe_bottom = 250 if a.size == "story" else 0
    text_top = h - safe_bottom - MARGIN - text_h
    gap = 8
    # Photos fill the whole post; the text sits over the lower one.
    if a.size == "square":
        pw, ph = (w - gap) // 2, h
        spots = [(0, 0), (pw + gap, 0)]
    else:
        pw, ph = w, (h - gap) // 2
        spots = [(0, 0), (0, ph + gap)]
    d = ImageDraw.Draw(canvas)
    lf = body_font(28, 600)
    for path, (x, y), label in zip((a.before, a.after), spots, ("BEFORE", "AFTER")):
        canvas.paste(cover(Image.open(path), pw, ph), (x, y))
    # Label chips: see-through dark emerald, like the text underlay.
    chip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chip)
    label_top = 250 if a.size == "story" else 28
    for (x, y), label in zip(spots, ("BEFORE", "AFTER")):
        ly = y + (label_top if y == 0 else 28)
        tw = d.textlength(label, font=lf) + 3 * len(label)
        cd.rectangle((x + 28, ly, x + 28 + tw + 40, ly + 56), fill=EMERALD_DARK + (205,))
    canvas.paste(chip, (0, 0), chip)
    d = ImageDraw.Draw(canvas)
    for (x, y), label in zip(spots, ("BEFORE", "AFTER")):
        ly = y + (label_top if y == 0 else 28)
        plain_text(d, (x + 48, ly + 10), [label], lf, GOLD_FLAT, tracking=3)
    underlay(canvas, text_top - 260, text_top - 10, 0.8)
    y = gold_text(canvas, (MARGIN, text_top), hlines, hf)
    rule(canvas, MARGIN, y + 10)
    footer(canvas, y + RULE_H + 24)
    return canvas


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="layout", required=True)
    s = sub.add_parser("photo")
    s.add_argument("--photo", required=True)
    s.add_argument("--headline", required=True)
    s.add_argument("--subline", default="")
    r = sub.add_parser("review")
    r.add_argument("--quote", required=True)
    r.add_argument("--name", required=True)
    b = sub.add_parser("before-after")
    b.add_argument("--before", required=True)
    b.add_argument("--after", required=True)
    b.add_argument("--headline", required=True)
    for x in (s, r, b):
        x.add_argument("--size", choices=SIZES, default="portrait")
        x.add_argument("--out", default="post.png")
    a = p.parse_args()
    img = {"photo": make_photo, "review": make_review, "before-after": make_before_after}[a.layout](a)
    img.save(a.out, quality=95)
    print(f"Saved {a.out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
