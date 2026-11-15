"""Build the GitHub Pages copy of the greenhouse map.

index.html is written in claude.ai artifact form (no <html>/<head>/<body>).
This wraps it into a complete page at docs/index.html, which GitHub Pages serves.

    python3 build.py
"""
from pathlib import Path

root = Path(__file__).parent
src = (root / "index.html").read_text(encoding="utf-8")

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

out = root / "docs" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page, encoding="utf-8")
print(f"Wrote {out.relative_to(root)} ({len(page):,} bytes)")
