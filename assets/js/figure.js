// The figures' shared runtime: one clock per figure, "pause all", each
// figure's own Pause, reader actions that run to their end, and the flash.
// Modeled on Martin C. Martin's ArticleFigure.vue (slidev-stem, MIT).
//
// A figure's clock runs only while the figure is on screen, the tab is
// visible, and neither the page nor the reader has paused it. A reader's
// action (Spend, Step, Tie the rope) still plays in a paused figure: the
// clock runs to the end of that change and stands there. A reader who asks
// for reduced motion starts with every figure paused, and an action then
// jumps straight to its end.
//
// THE FLASH. The part switches to the flash colors for 0.25 s and back for
// 0.25 s, five times (2.5 s), ending in its own colors: two flashes a
// second, under WCAG's three. One flash at a time per figure; a burst
// (marks.js) counts as one, so the two are never shown together.

export const reducedMotion =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const page = { paused: reducedMotion, figures: new Set() };
export const FLASH_ON = 0.25;
export const FLASH_COUNT = 5;
export const FLASH_LENGTH = FLASH_ON * 2 * FLASH_COUNT; // 2.5 s

export class Figure {
  /**
   * @param {HTMLElement} el the <figure class="fig">
   * @param {object} opts
   *   draw(t, fig)  paints the figure at clock time t (seconds)
   *   moves         true if the figure has an idle loop (shows a Pause)
   *   onFirstView() called once, the first time half of it is on screen
   */
  constructor(el, opts) {
    this.el = el;
    this.drawFn = opts.draw;
    this.moves = opts.moves !== false;
    this.onFirstView = opts.onFirstView;
    this.t = 0;
    this.busyUntil = 0;
    this.selfPaused = false;
    this.visible = false;
    this.seen = false;
    this.flashes = []; // {nodes, start}
    this.dirty = true;
    page.figures.add(this);

    this.pauseBtn = el.querySelector("[data-pause]");
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener("click", () => {
        this.selfPaused = !this.selfPaused;
        this.syncButtons();
        this.dirty = true;
      });
    }
    this.syncButtons();

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries.at(-1);
        this.visible = e.isIntersecting;
        if (!this.seen && e.intersectionRatio >= 0.5) {
          this.seen = true;
          if (this.onFirstView) this.onFirstView();
        }
        this.dirty = true;
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
  }

  get paused() {
    return page.paused || this.selfPaused;
  }

  get busy() {
    return this.t < this.busyUntil;
  }

  get running() {
    if (document.hidden || !this.visible) return false;
    return !this.paused || this.busy;
  }

  /** Starts a reader's change that lasts `seconds`; returns its start time.
   *  In a paused figure, for a reader who asks for reduced motion, the
   *  change jumps to its end. */
  act(seconds) {
    const start = this.t;
    this.busyUntil = Math.max(this.busyUntil, start + seconds);
    if (this.paused && reducedMotion) this.t = this.busyUntil;
    this.dirty = true;
    return start;
  }

  /** Flashes `nodes` (elements), now. Skipped while another flash runs,
   *  and in a paused figure unless the reader's own step asked for it. */
  flash(nodes, { byReader = false } = {}) {
    if (this.flashing) return false;
    if (this.paused && !byReader) return false;
    const list = Array.isArray(nodes) ? nodes : [nodes];
    this.flashes.push({ nodes: list, start: this.t });
    // a flash is part of the figure's time: let it finish even if paused
    this.busyUntil = Math.max(this.busyUntil, this.t + FLASH_LENGTH);
    this.dirty = true;
    return true;
  }

  get flashing() {
    return this.flashes.some((f) => this.t - f.start < FLASH_LENGTH);
  }

  syncButtons() {
    if (!this.pauseBtn) return;
    const paused = this.paused;
    this.pauseBtn.disabled = page.paused;
    this.pauseBtn.setAttribute("aria-pressed", String(paused));
    const [play, pause] = this.pauseBtn.querySelectorAll("span");
    if (play && pause) {
      play.classList.toggle("word-hidden", !paused);
      pause.classList.toggle("word-hidden", paused);
    }
  }

  frame(dt) {
    const run = this.running;
    if (run) {
      let next = this.t + dt;
      if (this.paused) next = Math.min(next, this.busyUntil);
      this.t = next;
    }
    if (run || this.dirty) {
      this.paintFlashes(run);
      this.drawFn(this.t, this);
      this.dirty = false;
    }
  }

  paintFlashes(run) {
    this.flashes = this.flashes.filter((f) => {
      const age = this.t - f.start;
      const done = age >= FLASH_LENGTH;
      const on = !done && run && Math.floor(age / FLASH_ON) % 2 === 0;
      for (const n of f.nodes) n.classList.toggle("is-flash", on);
      return !done;
    });
  }
}

let last = 0;
function loop(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;
  for (const f of page.figures) f.frame(dt);
  requestAnimationFrame(loop);
}

function setPagePaused(paused) {
  page.paused = paused;
  const btn = document.querySelector("[data-pause-all]");
  if (btn) {
    btn.setAttribute("aria-pressed", String(paused));
    btn.textContent = paused ? "play all" : "pause all";
  }
  for (const f of page.figures) {
    f.syncButtons();
    f.dirty = true;
  }
}

/** Wires the page: "pause all", the contents button, the figures' loop. */
export function initPage() {
  document.documentElement.classList.add("js");
  const btn = document.querySelector("[data-pause-all]");
  if (btn) btn.addEventListener("click", () => setPagePaused(!page.paused));
  setPagePaused(page.paused);

  const contents = document.querySelector(".contents");
  const toggle = contents && contents.querySelector(".contents-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = contents.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  document.addEventListener("visibilitychange", () => {
    last = 0;
  });
  requestAnimationFrame(loop);
}

// ---------- small helpers for the figures ----------

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
/** smooth 0→1 over [a, b] */
export const ease = (x, a = 0, b = 1) => {
  const p = clamp((x - a) / (b - a));
  return p * p * (3 - 2 * p);
};
export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];
export function at(el, x, y, rot = 0, s = 1) {
  el.setAttribute(
    "transform",
    `translate(${x.toFixed(2)} ${y.toFixed(2)})` +
      (rot ? ` rotate(${rot.toFixed(2)})` : "") +
      (s !== 1 ? ` scale(${s.toFixed(3)})` : ""),
  );
}
export function show(el, on) {
  el.classList.toggle("hidden", !on);
}
