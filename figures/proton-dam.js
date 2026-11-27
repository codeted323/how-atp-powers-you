// Figure 7.1 · proton-dam · 980 × 480 (phone: the two halves, stacked)
// A cross-section of the inner wall (context): Space between the walls
// above, Core of the mitochondrion below. Three pumping proteins (subject
// faces) sit in the wall, linked by two small mobile shuttles (context):
// one in the wall, one on its outer face. (The fourth, non-pumping complex
// is left out.) Electrons (a pair of dots, flow at 1.0; across the outer
// shuttle, one at a time) hop left to right
// down a faint staircase guide (ink at 0.5) drawn just under the wall, a
// step beneath each protein and shuttle. At each pumping protein, protons
// (plus-signed circles, flow at 0.7) pass up through the wall and pile up
// above, to a set level. At the last protein, oxygen arriving from below
// joins the electrons and protons and becomes water. 11 s loop at full
// oxygen. The Oxygen slider (0–100%): at 0 the electrons stall and stack up
// at the last protein, the pumping stops, and the pile stops growing.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle } from "../assets/js/marks.js";

const WALL = [170, 250]; // the inner wall's top and bottom
// the staircase: one tread per stop, left to right and down
const STOPS = [
  { name: "nadh", x: 100, y: 318 },
  { name: "p1", x: 240, y: 338, pump: 2 },
  { name: "q", x: 380, y: 358 },
  { name: "p3", x: 520, y: 378, pump: 2 },
  { name: "c", x: 655, y: 398 },
  { name: "p4", x: 790, y: 418, pump: 1 },
];
const HOP = 0.55; // s per hop at full oxygen
const NEW_PAIR = 2.75; // s between pairs arriving on NADH (two per O2, 4 per loop)
const PILE_MAX = 16;

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const input = fig.querySelector(`#${P}-oxygen`);
  const status = fig.querySelector(`#${P}-status`);
  let oxygen = Number(input.value) / 100;
  for (const c of [...svg.children]) c.remove();

  const defs = el("defs", {}, svg);
  const world = el("g", { id: `${P}-world` }, defs);

  // ---- context ----
  el("rect", { x: 0, y: WALL[0], width: 980, height: WALL[1] - WALL[0], class: "f-muted" }, world);
  el("path", { d: `M0 ${WALL[0]}H980M0 ${WALL[1]}H980`, class: "l-muted w3" }, world);
  // the shuttles: one in the wall, one on its outer face
  el("ellipse", { cx: 380, cy: 222, rx: 24, ry: 14, class: "f-muted l-muted w3", id: `${P}-shuttle-1` }, world);
  el("circle", { cx: 655, cy: 152, r: 17, class: "f-muted l-muted w3", id: `${P}-shuttle-2` }, world);
  // ---- the staircase guide and its ties up to each stop ----
  let d = `M${STOPS[0].x - 40} ${STOPS[0].y}`;
  STOPS.forEach((s, i) => {
    d += `H${s.x + 40}`;
    const n = STOPS[i + 1];
    if (n) d += `V${n.y}`;
  });
  el("path", { d, class: "l-ink w2 o50", id: `${P}-stairs` }, world);
  const tieTop = { p1: 290, q: 236, p3: 286, c: 169, p4: 286 };
  for (const s of STOPS.slice(1)) {
    el("path", { d: `M${s.x} ${s.y - 4}V${tieTop[s.name] + 8}`, class: "l-ink w2 o50 dash" }, world);
  }
  // ---- the three pumping proteins (subject) ----
  const pumps = [[240, 140, 300], [520, 136, 296], [790, 140, 296]].map(([cx, y0, y1], i) => {
    const g = el("g", { id: `${P}-pump-${i + 1}` }, world);
    el("rect", { x: cx - 58, y: y0, width: 116, height: y1 - y0, rx: 34, class: "f-subject l-subject w3" }, g);
    return g;
  });
  void pumps;
  // NADH, docked at the start of the stairs
  const nadh = el("g", { id: `${P}-nadh`, transform: `translate(${STOPS[0].x} ${STOPS[0].y + 30})` }, world);
  el("rect", { x: -34, y: -15, width: 68, height: 30, rx: 14, class: "f-subject l-subject w25" }, nadh);
  el("text", { x: 0, y: 5, "text-anchor": "middle", class: "t-small" }, nadh).textContent = "NADH";

  // ---- labels ----
  const lab = (x, y, words, anchor = "start", extra = "") => {
    const t = el("text", { x, y, "text-anchor": anchor, class: `lbl ${extra}` }, world);
    t.textContent = words;
    return t;
  };
  lab(20, 34, "Space between the walls");
  lab(20, 470, "Core of the mitochondrion");
  lab(20, 404, "NADH drops off electrons");
  el("path", { d: `M${STOPS[0].x} 384V${STOPS[0].y + 55}`, class: "l-ink w4" }, world);
  // (every label sits wholly in one half, so the phone's two halves keep it)
  lab(20, 66, "Protons pumped across");
  lab(960, 470, "Oxygen catches the electrons", "end");
  lab(960, 344, "Water", "end");
  // the voltage across the wall
  el("path", { d: `M30 ${WALL[0] + 4}V${WALL[1] - 4}M22 ${WALL[0] + 4}H38M22 ${WALL[1] - 4}H38`, class: "l-ink w2" }, world);
  const mv = el("text", { x: 46, y: 192, class: "lbl" }, world);
  el("tspan", { x: 46, dy: 0 }, mv).textContent = "About";
  el("tspan", { x: 46, dy: "1.15em" }, mv).textContent = "150–180";
  el("tspan", { x: 46, dy: "1.15em" }, mv).textContent = "millivolts";

  // ---- moving things ----
  const pile = Array.from({ length: PILE_MAX }, (_, i) => {
    const m = particle(world, "h", { id: `${P}-pile-${i + 1}`, upright: true });
    return m;
  });
  const pileSpots = pile.map((_, i) => [250 + (i % 8) * 86 + ((i >> 3) % 2) * 43, 112 - (i >> 3) * 34]);
  const RISERS = 6;
  const risers = Array.from({ length: RISERS }, (_, i) => particle(world, "h", { id: `${P}-rise-${i + 1}`, upright: true }));
  const PAIRS = 6;
  const pairs = Array.from({ length: PAIRS }, (_, i) => particle(world, "e2", { id: `${P}-pair-${i + 1}`, upright: true }));
  // the outer shuttle carries one electron at a time (approved by Ted,
  // 2026-11-27): across it, a pair travels as two singles, one after the other
  const singles = Array.from({ length: PAIRS }, (_, i) =>
    [0, 1].map((j) => particle(world, "e", { id: `${P}-pair-${i + 1}-e${j + 1}`, upright: true })),
  );
  const o2 = particle(world, "o2", { id: `${P}-o2` });
  const water = [0, 1].map((i) => particle(world, "h2o", { id: `${P}-water-${i + 1}`, upright: true }));

  // ---- the views: one whole, or two halves stacked ----
  const views = el("g", {}, svg);
  function layoutViews() {
    const narrow = fig.clientWidth < 640;
    for (const c of [...views.children]) c.remove();
    for (const c of [...defs.querySelectorAll("clipPath")]) c.remove();
    // labels a little larger when the halves are shown small
    for (const t of world.querySelectorAll("text")) t.setAttribute("font-size", narrow ? 22 : 17);
    if (!narrow) {
      svg.setAttribute("viewBox", "0 0 980 480");
      svg.setAttribute("width", 980);
      svg.setAttribute("height", 480);
      el("use", { href: `#${P}-world` }, views);
      return;
    }
    const halves = [[0, 500], [480, 500]];
    svg.setAttribute("viewBox", `0 0 500 ${480 * 2 + 20}`);
    svg.setAttribute("width", 500);
    svg.setAttribute("height", 480 * 2 + 20);
    halves.forEach(([x0, w], i) => {
      const cp = el("clipPath", { id: `${P}-half-${i + 1}` }, defs);
      el("rect", { x: x0, y: 0, width: w, height: 480 }, cp);
      const g = el("g", { transform: `translate(${-x0} ${i * 500})` }, views);
      el("use", { href: `#${P}-world`, "clip-path": `url(#${P}-half-${i + 1})` }, g);
    });
  }

  // ---- the simulation: pairs walk the stairs; oxygen lets the last go ----
  const sim = {
    last: null,
    pairs: Array.from({ length: PAIRS }, (_, i) => ({ p: -1 - i * (NEW_PAIR / HOP), live: false })),
    nextPair: 0, // time until the next pair lands on NADH
    used: 0, // pairs taken by oxygen
    pumped: 0,
    risers: [], // {x, t0}
    waterAt: [-99, -99],
    o2At: -99,
    clock: 0,
    waitEnd: 0, // time the front pair has waited at the last stop
  };
  const END = STOPS.length - 1;

  function step(dt) {
    sim.clock += dt;
    // NADH brings a new pair every NEW_PAIR seconds, if a pair is free
    sim.nextPair -= dt;
    if (sim.nextPair <= 0) {
      const free = sim.pairs.find((q) => !q.live);
      const blocked = sim.pairs.some((q) => q.live && q.p < 1);
      if (free && !blocked) {
        free.live = true;
        free.p = 0;
        sim.nextPair = NEW_PAIR;
      } else sim.nextPair = 0.2;
    }
    // move pairs, front first; each keeps a step behind the one ahead
    const live = sim.pairs.filter((q) => q.live).sort((a, b) => b.p - a.p);
    let limit = Infinity;
    for (const q of live) {
      const cap = Math.min(limit, END);
      const before = q.p;
      q.p = Math.min(cap, q.p + dt / HOP);
      // pumping: crossing onto a pumping stop sends protons up
      for (let s = Math.floor(before) + 1; s <= Math.floor(q.p); s++) {
        const stop = STOPS[s];
        if (stop && stop.pump) {
          for (let k = 0; k < stop.pump; k++) sim.risers.push({ x: stop.x + (k ? 18 : -18), t0: sim.clock + k * 0.25 });
          sim.pumped += stop.pump;
        }
      }
      limit = Math.floor(q.p) - 1;
    }
    // oxygen takes the front pair once it has sat at the last stop a while
    const front = live[0];
    if (front && front.p >= END) {
      sim.waitEnd += dt * oxygen;
      if (oxygen > 0.02 && sim.waitEnd > 0.6) {
        front.live = false;
        front.p = -1;
        sim.waitEnd = 0;
        sim.used++;
        if (sim.used % 2 === 1) sim.o2At = sim.clock - 0.6;
        else sim.waterAt = [sim.clock, sim.clock + 0.15];
      }
    } else sim.waitEnd = 0;
    sim.risers = sim.risers.filter((r) => sim.clock - r.t0 < 1.6);
  }

  function draw(t) {
    const dt = sim.last === null ? 0 : Math.max(0, Math.min(0.1, t - sim.last));
    sim.last = t;
    if (dt > 0) step(dt);

    // pairs on the stairs, hopping
    sim.pairs.forEach((q, i) => {
      const m = pairs[i];
      const [s1, s2] = singles[i];
      const single = q.live && q.p >= 3 && q.p < END; // the hops into and out of the outer shuttle
      m.g.style.display = q.live && !single ? "" : "none";
      s1.g.style.display = single ? "" : "none";
      s2.g.style.display = single ? "" : "none";
      if (!q.live) return;
      if (single) {
        const k = Math.floor(q.p);
        const a = STOPS[k];
        const b = STOPS[Math.min(END, k + 1)];
        [[s1, ease(q.p - k, 0.1, 0.55), -7], [s2, ease(q.p - k, 0.55, 1), 7]].forEach(([e, f, dx]) => {
          const x = lerp(a.x, b.x, f) + (f <= 0 ? dx : f >= 1 ? -dx : 0);
          const y = lerp(a.y, b.y, f) - 12 - Math.sin(f * Math.PI) * 26;
          e.place(x, y, 0, f > 0.02 && f < 0.98);
        });
        return;
      }
      const k = Math.floor(q.p);
      const f = ease(q.p - k, 0.2, 1);
      const a = STOPS[Math.max(0, Math.min(END, k))];
      const b = STOPS[Math.max(0, Math.min(END, k + 1))];
      const x = lerp(a.x, b.x, f);
      const y = lerp(a.y, b.y, f) - 12 - Math.sin(f * Math.PI) * 26;
      m.place(x, y, 0, f > 0.02 && f < 0.98);
    });
    // protons rising through the pumps, into the pile
    risers.forEach((m, i) => {
      const r = sim.risers[i];
      m.g.style.display = r ? "" : "none";
      if (!r) return;
      const q = ease(sim.clock - r.t0, 0, 1.6);
      m.place(r.x, lerp(330, 120, q), -90, q > 0 && q < 1);
      if (sim.clock < r.t0) m.g.style.display = "none";
    });
    // the pile grows to its set level as protons are pumped
    const n = Math.min(PILE_MAX, 4 + sim.pumped);
    pile.forEach((m, i) => {
      m.g.style.display = i < n ? "" : "none";
      const [x, y] = pileSpots[i];
      const j = Math.sin(t * 2.1 + i * 1.7) * 3;
      m.place(x + j, y + Math.cos(t * 1.7 + i) * 3, 0, false);
    });
    // oxygen arrives from below, at the last stop
    const so = sim.clock - sim.o2At;
    o2.g.style.display = so >= 0 && so < 1.6 ? "" : "none";
    if (so >= 0 && so < 1.6) {
      const q = ease(so, 0, 1.0);
      o2.place(lerp(880, 812, q), lerp(500, 440, q), null, q < 1);
    }
    // two waters drift away
    water.forEach((m, i) => {
      const s = sim.clock - sim.waterAt[i];
      m.g.style.display = s >= 0 && s < 2.2 ? "" : "none";
      if (s >= 0 && s < 2.2) {
        const q = ease(s, 0, 2.2);
        m.place(lerp(820, 920 - i * 30, q), lerp(440, 380 + i * 20, q), null, true);
      }
    });
  }

  layoutViews();
  const figure = new Figure(fig, { draw });
  new ResizeObserver(layoutViews).observe(fig);
  input.addEventListener("input", () => {
    oxygen = Number(input.value) / 100;
    input.setAttribute("aria-valuetext", `${input.value} percent`);
    status.textContent = oxygen <= 0.02
      ? "No oxygen: the electrons back up at the last protein, and the pumping stops."
      : "";
    figure.dirty = true;
  });
}
