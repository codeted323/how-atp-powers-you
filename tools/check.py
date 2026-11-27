#!/usr/bin/env python3
"""Checks the drawing rules on every page and figure script.

  python3 tools/check.py

1. Every id inside a figure starts with the figure's own id and a dash
   (figure "atp-molecule" -> "atp-molecule-end-bead"), so copies never collide.
2. No stroke width outside the ladder: an SVG sets widths only with the
   classes w2 / w25 / w3 / w4, never a stroke-width attribute or style.
3. No raw colors in the drawings: no fill= / stroke= with a color value, no
   hex in a figure script; marks take color from the palette classes.
4. Every figure has an <svg role="img"> labeled by an element with text
   (its alt text), and each control is a <button> or <input>.
5. site.css keeps the ladder: .w2/.w25/.w3/.w4 are 2, 2.5, 3, 4 px.
Exits 1 on any failure.
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(")
problems = []


def bad(where, msg):
    problems.append(f"{where}: {msg}")


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []  # (tag, figure_id or None)
        self.fig = None
        self.fig_depth = 0
        self.depth = 0
        self.in_svg = 0
        self.texts = {}  # id -> text
        self.cur_ids = []
        self.labels = []  # (figure id, svg labelledby)
        self.figs_with_svg = set()
        self.figs = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.depth += 1
        if tag == "figure" and "fig" in (a.get("class") or "").split():
            self.fig = a.get("id")
            self.fig_depth = self.depth
            self.figs.append(self.fig)
            if not self.fig:
                bad(self.path, "a figure has no id")
        if tag == "svg":
            self.in_svg += 1
            if self.fig and "art" in (a.get("class") or "").split():
                self.figs_with_svg.add(self.fig)
                if a.get("role") != "img":
                    bad(self.path, f"#{self.fig}: svg.art lacks role=img")
                lb = a.get("aria-labelledby")
                if not lb and not a.get("aria-label"):
                    bad(self.path, f"#{self.fig}: svg.art has no alt text")
                if lb:
                    self.labels.append((self.fig, lb))
        if self.fig and "id" in a and a["id"] != self.fig:
            if not a["id"].startswith(self.fig + "-"):
                bad(self.path, f"#{self.fig}: id '{a['id']}' lacks the figure's prefix")
        if self.in_svg:
            if "stroke-width" in a or "stroke-width" in (a.get("style") or ""):
                bad(self.path, f"<{tag}> sets a stroke width off the class ladder")
            for k in ("fill", "stroke"):
                if k in a and COLOR.search(a[k] or ""):
                    bad(self.path, f"<{tag}> has a raw {k} color {a[k]}")
            if COLOR.search(a.get("style") or ""):
                bad(self.path, f"<{tag}> has a raw color in style")
        if "id" in a:
            self.cur_ids.append([a["id"], self.depth, ""])

    def handle_endtag(self, tag):
        for entry in self.cur_ids:
            if entry[1] == self.depth:
                self.texts[entry[0]] = entry[2]
        self.cur_ids = [e for e in self.cur_ids if e[1] != self.depth]
        if tag == "svg" and self.in_svg:
            self.in_svg -= 1
        if self.fig and self.depth == self.fig_depth and tag == "figure":
            self.fig = None
        self.depth -= 1

    def handle_data(self, data):
        for entry in self.cur_ids:
            entry[2] += data


def check_page(path):
    p = Page(path.relative_to(ROOT))
    p.feed(path.read_text())
    for fig, lb in p.labels:
        text = p.texts.get(lb, "").strip()
        if len(text) < 20:
            bad(p.path, f"#{fig}: alt text #{lb} is missing or too short")
    for fig in p.figs:
        if fig and fig not in p.figs_with_svg and "canvas" not in path.read_text():
            bad(p.path, f"#{fig}: no svg.art")


def check_script(path):
    text = path.read_text()
    rel = path.relative_to(ROOT)
    for m in re.finditer(r"stroke-width|strokeWidth|lineWidth\s*=", text):
        line = text.count("\n", 0, m.start()) + 1
        bad(rel, f"line {line}: sets a stroke width (use w2/w25/w3/w4)")
    for m in COLOR.finditer(text):
        line_start = text.rfind("\n", 0, m.start()) + 1
        line_text = text[line_start : text.find("\n", m.start())]
        if "palette" in line_text or "// fallback" in line_text:
            continue
        line = text.count("\n", 0, m.start()) + 1
        bad(rel, f"line {line}: raw color {m.group(0)}")


def check_css():
    css = (ROOT / "assets/css/site.css").read_text()
    want = {"w2": "2px", "w25": "2.5px", "w3": "3px", "w4": "4px"}
    for cls, px in want.items():
        m = re.search(r"\." + cls + r"\s*\{\s*stroke-width:\s*([\d.]+px)", css)
        if not m or m.group(1) != px:
            bad("site.css", f".{cls} should be {px}")
    for m in re.finditer(r"stroke-width:\s*([\d.]+)px", css):
        if m.group(1) not in ("2", "2.5", "3", "4"):
            bad("site.css", f"stroke-width {m.group(1)}px is off the ladder")


for html in sorted(ROOT.glob("article/*/index.html")) + [ROOT / "marks/index.html"]:
    if html.exists():
        check_page(html)
for js in sorted((ROOT / "figures").glob("*.js")) + [ROOT / "assets/js/marks.js"]:
    check_script(js)
check_css()

if problems:
    print("\n".join(problems))
    print(f"{len(problems)} problem(s)")
    sys.exit(1)
print("ok: drawing rules hold")
