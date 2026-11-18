"""Builds public/brand/emerald-forest-post-kit.zip: the kit Noah uploads
to ChatGPT (or another AI that runs Python) with his photo.

Contents: post-kit/ (instructions + make_post.py), the brand brief from
/brand.json, TTF copies of the site fonts (Pillow can't read woff2),
the logos and the icon PNGs. Run after changing any of them:
  python scripts/build-post-kit.py
"""
import io, json, os, subprocess, zipfile
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
out = "public/brand/emerald-forest-post-kit.zip"

brief = subprocess.run(
    ["node", "-e", "import('./src/esteemed/brand/build.mjs').then(m=>process.stdout.write(m.buildBrand(process.cwd(),'https://emeraldforestfurnishings.com').summary))"],
    capture_output=True, text=True, check=True, encoding="utf8").stdout

def ttf(src):
    f = TTFont(src)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("post-kit/READ-ME-FIRST-AI.md", "READ-ME-FIRST-AI.md")
    z.write("post-kit/make_post.py", "make_post.py")
    z.writestr("brand-brief.txt", brief)
    z.writestr("fonts/LibreCaslonText-Bold.ttf", ttf("src/assets/fonts/libre-caslon-text-700.woff2"))
    z.writestr("fonts/Jost-Variable.ttf", ttf("src/assets/fonts/jost-variable.woff2"))
    z.writestr("fonts/LICENSE.txt", "Libre Caslon Text and Jost: SIL Open Font License 1.1 (fonts.google.com).\n")
    for n in ("logo.png", "logo-light.png", "logo-dark.png", "logo-on-black.png"):
        z.write(f"public/brand/{n}", f"logos/{n}")
    for n in sorted(os.listdir("public/brand/icons")):
        if n.endswith(".png"):
            z.write(f"public/brand/icons/{n}", f"icons/{n}")
print(out, os.path.getsize(out) // 1024, "KB")
