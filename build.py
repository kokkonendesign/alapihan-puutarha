"""Build the GitHub Pages site.

The pages are written in claude.ai artifact form (no <html>/<head>/<body>).
This wraps each into a complete page under docs/, which GitHub Pages serves:

    piha.html        -> docs/index.html        (front page: the yard)
    kasvihuone.html  -> docs/kasvihuone.html   (greenhouse plant map, ?talo=1..5)
    pin-gate.js      -> docs/pin-gate.js       (name + family PIN screen, shared by both pages)

    python3 build.py
"""
from pathlib import Path

root = Path(__file__).parent
PAGES = {"piha.html": "index.html", "kasvihuone.html": "kasvihuone.html"}

for src_name, out_name in PAGES.items():
    src = (root / src_name).read_text(encoding="utf-8")
    # Everything before the page header (title, meta tags, styles) belongs in <head>.
    split = src.index("<header>")
    head, body = src[:split].strip(), src[split:].strip()
    page = f"""<!doctype html>
<html lang="fi">
<head>
{head}
</head>
<body>
{body}
</body>
</html>
"""
    out = root / "docs" / out_name
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"Wrote {out.relative_to(root)} ({len(page):,} bytes)")

# shared scripts are copied as they are
for name in ["pin-gate.js"]:
    (root / "docs" / name).write_text((root / name).read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Copied docs/{name}")

# images are copied byte for byte
for name in ["logo.png"]:
    (root / "docs" / name).write_bytes((root / name).read_bytes())
    print(f"Copied docs/{name}")
