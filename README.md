# How ATP Powers You

An interactive explainer in nine parts: what ATP is, what kind of energy it
holds, how it makes things move, and how the air you breathe and the food you
eat rebuild it. One page per part, at `article/1/` … `article/9/`, with live
line drawings between the paragraphs.

Live: https://codeted323.github.io/how-atp-powers-you/

## How it's built

Plain HTML, CSS and JavaScript modules. No build step, no framework, no CDN:
GitHub Pages serves the files as they are.

```
article/N/index.html   one part per page; its text, its inline SVG figures
assets/css/site.css    the palette (--palette-*), type, layout, controls
assets/js/figure.js    the figures' clock, "pause all", Pause, steps, flash
assets/js/marks.js     shared marks: flow (particles), energy burst, ATP
figures/<name>.js      one script per figure, named for the figure
marks/                 a test page for the shared marks (not linked)
tools/check.py         checks the drawing rules (run before each commit)
```

To preview: `python3 -m http.server` in this folder, then open
http://localhost:8000/article/1/.

Run `python3 tools/check.py` before committing. It checks that every SVG id
starts with its figure's name, that strokes come only from the 2 / 2.5 / 3 /
4 px classes, that colors come only from the palette classes, and that every
figure has alt text.

## Drawing rules (Explainer Style)

- Color by job: subject navy, context gray-brown, orange only for "look
  here". A new role, `flow`, marks particles in transit (see `marks/`).
- Strokes: 2, 2.5, 3 and 4 px only, as displayed (non-scaling strokes keep
  them on a phone too). Faces are solid washes; every drawing must read with
  the washes removed.
- Only the subject moves. Loops have fixed, unequal lengths. A flash is
  0.25 s on / 0.25 s off, five times. Reduced motion starts every figure
  paused.

## Credits and licenses

- Code: MIT (`LICENSE`). Text and art: CC BY 4.0 (`LICENSE-content`).
- Adapted from Martin C. Martin's *What Everyone Should Know About
  Mechanical Watches* ([live](https://martincmartin.github.io/slidev-stem/watches/article/1/),
  [source](https://github.com/martincmartin/slidev-stem); text and art
  CC BY 4.0, code MIT), itself inspired by Bartosz Ciechanowski's
  *Mechanical Watch*. See `NOTICE`.
- Fonts: Fraunces, IBM Plex Sans, IBM Plex Mono (SIL OFL 1.1), in
  `assets/fonts` with their licenses.
