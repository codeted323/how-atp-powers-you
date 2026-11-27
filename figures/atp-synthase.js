// Figure 8.1 · atp-synthase · 980 × 560, WebGL (drag to turn); phone 354 × 480
// A side view of ATP synthase in the inner wall (wall in context). The
// eight-unit rotor ring and the bent axle are the subject. The head is six
// alternating parts held by a side arm (context), with its three active
// sites drawn as subject faces. Protons use the flow mark: they enter from
// the crowded side beside the side arm, ride the ring, and leave into the
// core. (The head points down, into the core, as in Figure 7.1, where the
// core is below the wall.)
// Moves: steady rotation slowed about 300 times (one turn every 3 s at full
// flow, instead of 100 a second). Each site cycles open → gripping ADP and
// phosphate → clamped (ATP forms) → open (ATP leaves); one ATP leaves every
// third of a turn. The watched site flashes once when it first lets an ATP
// go. Controls: Proton flow (0 = stopped); drag or arrow keys to turn the
// view, stopping short of edge-on; Reset view. Counter: Turns · Protons (8
// per turn) · ATP (3 per turn).
import { Figure, ease, lerp, reducedMotion, FLASH_ON, FLASH_LENGTH } from "../assets/js/figure.js";
import { el, particle, atpCompact } from "../assets/js/marks.js";
import { makeRenderer, M, rgb } from "../assets/js/gl/lineweighted.js";

const TURN = 3; // s per turn at full flow
const RING_R = 60;
const UNITS = 8;
const VIEW0 = { yaw: 0.5, pitch: 0.24 };
const PITCH = [0.1, 0.62]; // never edge-on
const YAW = [-1.3, 1.9];
const HEAD_Y = -232;
const SITE_R = 72;

const LABELS = [
  { key: "in", words: "Protons flow in", at: [-95, 150, 18] },
  { key: "ring", words: "Rotor ring (8 units)", at: [RING_R + 16, 0, 26] },
  { key: "axle", words: "Bent axle", at: [10, -120, 0] },
  { key: "head", words: "Head with three active sites", at: [74, HEAD_Y, 10] },
  { key: "arm", words: "Side arm holds the head still", at: [-103, -170, 0] },
];
// where the label text sits (css px), and which way it reads from there
const SPOTS = {
  wide: {
    in: [360, 64, "end"], arm: [300, 400, "end"],
    ring: [650, 236, "start"], axle: [650, 318, "start"], head: [650, 430, "start"],
  },
  narrow: {
    in: [8, 22, "start"], ring: [346, 22, "end"],
    arm: [8, 444, "start"], axle: [346, 444, "end"], head: [346, 468, "end"],
  },
};

export function mount(fig) {
  const P = fig.id;
  const canvas = fig.querySelector("canvas.gl");
  const fallback = fig.querySelector("svg.gl-fallback");
  const counter = fig.querySelector(`#${P}-counter`);
  const caption = fig.querySelector(`#${P}-caption`);
  const flow = fig.querySelector(`#${P}-flow`);
  const resetBtn = fig.querySelector(`#${P}-reset`);
  caption.textContent = "Slowed about 300 times.";

  const R = makeRenderer(canvas);
  if (!R) {
    fig.classList.add("no-gl");
    drawFallback(fallback);
    return;
  }

  // the overlay: flow marks, nucleotides and labels, in SVG over the canvas
  const wrap = document.createElement("div");
  wrap.className = "gl-wrap";
  canvas.parentNode.insertBefore(wrap, canvas);
  wrap.appendChild(canvas);
  const over = el("svg", { class: "art gl-overlay", "aria-hidden": "true" });
  wrap.appendChild(over);

  const css = getComputedStyle(document.documentElement);
  const col = (role) => rgb(css.getPropertyValue(`--palette-${role}`));
  const C = {
    paper: col("paper"), subject: col("subject"), sWash: col("subject-wash"),
    muted: col("muted"), mWash: col("muted-wash"), second: col("second"), secWash: col("second-wash"),
  };

  const state = {
    theta: 0, // rotor angle
    rate: Number(flow.value) / 100,
    yaw: VIEW0.yaw, pitch: VIEW0.pitch,
    from: null, // a view easing back: {yaw, pitch, t0}
    last: null,
    flashAt: null, // wall time of the watched site's flash
    flashed: false,
    narrow: false, w: 980, h: 560, dpr: 1,
  };

  // ---- overlay contents ----
  const lines = el("g", {}, over);
  const labelEls = {};
  for (const l of LABELS) {
    const g = el("g", {}, over);
    const t = el("text", { class: "lbl" }, g);
    t.textContent = l.words;
    const ld = el("path", { class: "l-ink w4" }, lines);
    labelEls[l.key] = { t, ld };
  }
  const protons = Array.from({ length: 12 }, () => particle(over, "h", { upright: true }));
  const sites = [0, 1, 2].map(() => ({
    adp: atpCompact(over, 0, 0, 2),
    pi: (() => {
      const g = el("g", {}, over);
      el("circle", { cx: 0, cy: 0, r: 6, class: "f-subject l-subject w25" }, g);
      return g;
    })(),
    atp: atpCompact(over, 0, 0, 3),
  }));
  const newAtp = el("text", { class: "lbl" }, over);
  newAtp.textContent = "New ATP";

  function size() {
    const narrow = fig.clientWidth < 640;
    const w = Math.min(980, fig.clientWidth);
    const h = narrow ? 480 : Math.round((w * 560) / 980);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    Object.assign(state, { narrow, w, h, dpr });
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    wrap.style.width = `${w}px`;
    wrap.style.height = `${h}px`;
    over.setAttribute("width", w);
    over.setAttribute("height", h);
    over.setAttribute("viewBox", `0 0 ${w} ${h}`);
    for (const k in labelEls) labelEls[k].t.setAttribute("font-size", narrow ? 15 : 17);
    newAtp.setAttribute("font-size", narrow ? 15 : 17);
    if (figure) figure.dirty = true;
  }

  function viewProj() {
    const dist = state.narrow ? 1060 : 930;
    const target = [state.narrow ? -6 : 0, state.narrow ? -88 : -96, 0];
    const proj = M.persp((32 * Math.PI) / 180, state.w / state.h, 200, 3000);
    const view = M.mul(M.trans(0, 0, -dist), M.mul(M.rotX(state.pitch), M.mul(M.rotY(state.yaw), M.trans(-target[0], -target[1], -target[2]))));
    return { vp: M.mul(proj, view), view };
  }
  const toScreen = (vp, p) => {
    const c = M.apply(vp, p);
    return [((c[0] + 1) / 2) * state.w, ((1 - c[1]) / 2) * state.h, c[2]];
  };
  const depth = (view, p) => M.apply(view, p)[2]; // larger is nearer

  // ---- the scene ----
  function scene(flashOn) {
    const items = [];
    const th = state.theta;
    const add = (mesh, model, role, width) => {
      const r = {
        subject: [C.sWash, C.subject], muted: [C.mWash, C.muted], site: [C.sWash, C.subject],
        flash: [C.secWash, C.second],
      }[role];
      items.push({ mesh, model, wash: r[0], line: r[1], width });
    };
    // the wall, cut away at z = 0, and the stator in it
    add("box", M.mul(M.trans(0, 0, -75), M.scale(300, 40, 75)), "muted", 3);
    add("box", M.mul(M.trans(-98, 0, 0), M.scale(16, 40, 26)), "muted", 3);
    // the rotor ring: eight units
    for (let i = 0; i < UNITS; i++) {
      const a = th + (i * 2 * Math.PI) / UNITS;
      add("cylinder", M.mul(M.trans(RING_R * Math.cos(a), 0, -RING_R * Math.sin(a)), M.scale(17, 46, 17)), "subject", 3);
    }
    // the bent axle: a straight part, then a bent one; it turns with the ring
    const spin = M.rotY(th);
    add("cylinder", M.mul(spin, M.mul(M.trans(0, -50, 0), M.scale(11, 82, 11))), "subject", 3);
    const bend = 0.22;
    add("cylinder", M.mul(spin, M.mul(M.trans(14, -186, 0), M.mul(M.rotZ(bend), M.scale(11, 62, 11)))), "subject", 3);
    // the head: six alternating parts, still
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      add("sphere", M.mul(M.trans(46 * Math.cos(a), HEAD_Y, -46 * Math.sin(a)), M.scale(29, 62, 29)), "muted", 3);
    }
    // the three active sites, on every other part
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3 + Math.PI / 6;
      const s = siteScale(k);
      const role = k === 0 && flashOn ? "flash" : "site";
      add("sphere", M.mul(M.trans(SITE_R * Math.cos(a), HEAD_Y - 4, -SITE_R * Math.sin(a)), M.scale(12 * s, 20 * s, 12 * s)), role, 2.5);
    }
    // the side arm: down from the stator, then under the head
    add("cylinder", M.mul(M.trans(-104, -170, 0), M.scale(8, 132, 8)), "muted", 3);
    add("cylinder", M.mul(M.trans(-70, -302, 0), M.mul(M.rotZ(Math.PI / 2), M.scale(8, 36, 8))), "muted", 3);
    return items;
  }
  // each site's place in its cycle, 0..1: 0 open, then grip, clamp, release
  const phase = (k) => {
    const v = (state.theta - (k * 2 * Math.PI) / 3) / (2 * Math.PI);
    return ((v % 1) + 1) % 1;
  };
  function siteScale(k) {
    const f = phase(k);
    if (f < 0.12) return 1.05;
    if (f < 0.33) return lerp(1.05, 0.92, ease(f, 0.12, 0.2));
    if (f < 0.66) return lerp(0.92, 0.74, ease(f, 0.33, 0.4));
    return lerp(0.74, 1.05, ease(f, 0.66, 0.72));
  }

  // ---- drawing a frame ----
  function draw(t) {
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.1, t - state.last));
    state.last = t;
    const before = state.theta;
    state.theta += dt * state.rate * ((2 * Math.PI) / TURN);
    // the watched site lets its first ATP go: flash it once
    const crossed = (k) => {
      const f0 = (((before - (k * 2 * Math.PI) / 3) / (2 * Math.PI)) % 1 + 1) % 1;
      const f1 = phase(k);
      return state.theta > before && f0 < 0.66 && (f1 >= 0.66 || f1 < f0);
    };
    if (!state.flashed && crossed(0)) {
      state.flashed = true;
      state.flashAt = performance.now() / 1000;
    }
    // easing the view back
    if (state.from) {
      const q = ease(performance.now() / 1000 - state.from.t0, 0, 0.6);
      state.yaw = lerp(state.from.yaw, VIEW0.yaw, q);
      state.pitch = lerp(state.from.pitch, VIEW0.pitch, q);
      if (q >= 1) state.from = null;
      figure.dirty = true;
    }
    let flashOn = false;
    if (state.flashAt !== null) {
      const age = performance.now() / 1000 - state.flashAt;
      if (age < FLASH_LENGTH) {
        flashOn = Math.floor(age / FLASH_ON) % 2 === 0;
        figure.dirty = true;
      }
    }

    const { vp, view } = viewProj();
    R.draw(scene(flashOn), vp, C.paper, state.dpr);
    drawOverlay(vp, view);

    const turns = Math.floor(state.theta / (2 * Math.PI));
    const pro = Math.floor(state.theta / ((2 * Math.PI) / UNITS));
    const atp = Math.floor((3 * state.theta) / (2 * Math.PI) + 1e-6);
    const text = `Turns ${turns} · Protons ${pro} · ATP ${atp}`;
    if (counter.textContent !== text) counter.textContent = text;
  }

  function drawOverlay(vp, view) {
    const th = state.theta;
    const step = (2 * Math.PI) / UNITS;
    const ringDepth = depth(view, [0, 0, 0]);
    // protons: one lands on the unit facing the stator every 1/8 turn,
    // rides almost a full turn, then steps off into the core
    const nNow = Math.floor(th / step);
    let used = 0;
    for (let n = nNow - 8; n <= nNow + 1 && used < protons.length; n++) {
      const land = n * step;
      const rel = th - land; // rotor turn since it landed
      if (rel < -step || rel > 2 * Math.PI) continue;
      let p;
      let moving = true;
      const unitAt = (r) => {
        const a = Math.PI + r; // it landed on the unit at angle pi (beside the stator)
        return [RING_R * Math.cos(a) + 4, 36, -RING_R * Math.sin(a)];
      };
      if (rel < 0) {
        const q = 1 + rel / step;
        p = [lerp(-100, -64, q), lerp(150, 36, q), lerp(20, 0, q)];
      } else if (rel < 2 * Math.PI - step) {
        p = unitAt(rel);
        moving = state.rate > 0.01;
      } else {
        const q = (rel - (2 * Math.PI - step)) / step;
        const a = unitAt(2 * Math.PI - step);
        p = [lerp(a[0], -86, q), lerp(-30, -120, q), lerp(a[2], 40, q)];
      }
      const m = protons[used++];
      const behind = rel >= 0 && rel < 2 * Math.PI - step && depth(view, p) < ringDepth - 8;
      const [x, y] = toScreen(vp, p);
      m.g.style.display = behind ? "none" : "";
      m.place(x, y, null, moving);
    }
    for (; used < protons.length; used++) protons[used].g.style.display = "none";

    // nucleotides at the sites
    const headDepth = depth(view, [0, HEAD_Y, 0]);
    let watched = null;
    sites.forEach((s, k) => {
      const a = (k * 2 * Math.PI) / 3 + Math.PI / 6;
      const out = (r) => [r * Math.cos(a), HEAD_Y - 4, -r * Math.sin(a)];
      const f = phase(k);
      const far = depth(view, out(SITE_R)) < headDepth;
      const at = (r) => toScreen(vp, out(r));
      const put = (g, xy, dx = 0) => g.setAttribute("transform", `translate(${(xy[0] + dx).toFixed(1)} ${xy[1].toFixed(1)})`);
      const show = (g, on) => (g.style.display = on && !far ? "" : "none");
      // ADP and phosphate come in (0.12–0.2), gripped until 0.45
      const inQ = ease(f, 0.12, 0.2);
      const gripped = f >= 0.12 && f < 0.45;
      show(s.adp.g, gripped);
      show(s.pi, gripped);
      if (gripped) {
        put(s.adp.g, at(lerp(150, SITE_R + 12, inQ)), -30);
        put(s.pi, at(lerp(160, SITE_R + 16, inQ)), 28);
      }
      // ATP formed in the clamp (0.45–0.66), then leaves (0.66–0.95)
      const outQ = ease(f, 0.66, 0.95);
      const formed = f >= 0.45 && f < 0.95;
      show(s.atp.g, formed);
      if (formed) put(s.atp.g, at(lerp(SITE_R + 12, 190, outQ)), -26);
      if (k === 0 && f >= 0.66 && f < 0.95 && !far && state.flashed) watched = at(lerp(SITE_R + 12, 190, outQ));
    });
    newAtp.style.display = watched ? "" : "none";
    if (watched) {
      newAtp.setAttribute("x", watched[0] + 34);
      newAtp.setAttribute("y", watched[1] - 12);
    }

    // labels and their leaders: level from the text, then straight to the part
    const spots = SPOTS[state.narrow ? "narrow" : "wide"];
    for (const l of LABELS) {
      const { t, ld } = labelEls[l.key];
      const [sx, sy, anchor] = spots[l.key];
      t.setAttribute("x", sx);
      t.setAttribute("y", sy);
      t.setAttribute("text-anchor", anchor);
      const width = t.getComputedTextLength ? t.getComputedTextLength() : 100;
      const left = anchor === "end" ? sx - width : sx;
      const right = left + width;
      const [tx, ty] = toScreen(vp, l.at);
      let d;
      if (tx >= left - 4 && tx <= right + 4) {
        // the part lies under (or over) the words: drop straight to it
        const y0 = ty > sy ? sy + 7 : sy - 21;
        const dy = ty - y0;
        d = `M${tx.toFixed(1)} ${y0}L${tx.toFixed(1)} ${(ty - Math.sign(dy) * 12).toFixed(1)}`;
      } else {
        // level from the nearer end of the words, then straight to the part
        const start = tx > right ? right + 8 : left - 8;
        const dir = tx > start ? 1 : -1;
        const run = start + dir * 14;
        const dx = tx - run;
        const dy = ty - (sy - 5);
        const len = Math.hypot(dx, dy) || 1;
        d = `M${start.toFixed(1)} ${sy - 5}H${run.toFixed(1)}L${(tx - (dx / len) * 12).toFixed(1)} ${(ty - (dy / len) * 12).toFixed(1)}`;
      }
      ld.setAttribute("d", d);

    }
  }

  // ---- the reader's controls ----
  let figure = null;
  size();
  figure = new Figure(fig, { draw });
  new ResizeObserver(size).observe(fig);

  flow.addEventListener("input", () => {
    state.rate = Number(flow.value) / 100;
    flow.setAttribute("aria-valuetext", state.rate <= 0 ? "Stopped" : state.rate >= 1 ? "Full" : `${flow.value} percent`);
    figure.dirty = true;
  });
  const turnBy = (dy, dp) => {
    state.from = null;
    state.yaw = Math.min(YAW[1], Math.max(YAW[0], state.yaw + dy));
    state.pitch = Math.min(PITCH[1], Math.max(PITCH[0], state.pitch + dp));
    figure.dirty = true;
  };
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    // a finger turns sideways only; an up-down swipe scrolls the page
    turnBy(dx * 0.008, drag.touch ? 0 : dy * 0.005);
  });
  const end = () => (drag = null);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06] }[e.key];
    if (!k) return;
    e.preventDefault();
    turnBy(k[0], k[1]);
  });
  canvas.setAttribute("aria-roledescription", "3D figure; arrow keys turn it");
  resetBtn.addEventListener("click", () => {
    if (reducedMotion) {
      state.yaw = VIEW0.yaw;
      state.pitch = VIEW0.pitch;
    } else state.from = { yaw: state.yaw, pitch: state.pitch, t0: performance.now() / 1000 };
    figure.dirty = true;
  });
}

// Without WebGL: the same side view, still, in SVG.
function drawFallback(svg) {
  const P = "atp-synthase";
  for (const c of [...svg.children]) c.remove();
  const g = el("g", { transform: "translate(490 0)" }, svg);
  el("rect", { x: -300, y: 120, width: 600, height: 80, class: "f-muted l-muted w3", id: `${P}-fb-wall` }, g);
  el("rect", { x: -150, y: 120, width: 34, height: 80, class: "f-muted l-muted w3" }, g);
  for (let i = 0; i < 4; i++) el("rect", { x: -80 + i * 40, y: 112, width: 34, height: 96, rx: 16, class: "f-subject l-subject w3" }, g);
  el("path", { d: "M0 208V300L16 400", class: "l-subject w4" }, g);
  for (let k = 0; k < 3; k++) el("ellipse", { cx: -60 + k * 60, cy: 420, rx: 34, ry: 70, class: "f-muted l-muted w3" }, g);
  el("ellipse", { cx: 60, cy: 420, rx: 14, ry: 22, class: "f-subject l-subject w25" }, g);
  el("path", { d: "M-133 200V505H-40", class: "l-muted w3" }, g);
  el("text", { x: -120, y: 80, "text-anchor": "end" }, g).textContent = "Protons flow in";
  el("text", { x: 120, y: 170 }, g).textContent = "Rotor ring (8 units)";
  el("text", { x: 120, y: 520 }, g).textContent = "Head with three active sites";
}
