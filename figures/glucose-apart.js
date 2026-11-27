// Figure 6.1 · glucose-apart · 980 × 460 (phone: stacked, 354 × 640)
// Glucose as a chain of six carbon beads (subject) in the cell's fluid
// (context wash); a mitochondrion (context) holding a circular track for
// the Krebs cycle. Carriers are small shuttles labeled NADH (ten) or FADH2
// (two, loaded in the loop), drawn empty or loaded with a pair of electron
// marks. Carbon dioxide uses the flow mark and drifts up and out.
// Step walks five stages; Play loops them in 19 s:
//   1 glucose splits into two three-bead halves; 2 ATP pop out; 2 carriers load
//   2 the halves move into the mitochondrion
//   3 each half drops one bead as CO2; carriers load
//   4 the two-bead pieces ride the loop, each dropping two beads as CO2,
//     carriers loading as they go, and 1 ATP popping out per turn
//   5 the tally
// Counter: Carbons left 6 → 0 · CO2 out 0 → 6 · ATP made 4 · Carriers loaded 12.
// (Glucose drawn as a chain, not a ring: its ring holds five carbons and an
// oxygen. Approved by Ted, 2026-11-27.)
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle, atpCompact } from "../assets/js/marks.js";

const ST = [0, 3.5, 6, 9, 16, 19]; // stage starts; the loop is 19 s
const LOOP = 19;
// carriers: [index of the stage it loads in, time within, which half/piece]
// 10 NADH and 2 FADH2: glycolysis 2, the step into the loop 2, each turn 3 + 1
const CARRIERS = [
  { kind: "NADH", at: 1.6, from: "mid" },
  { kind: "NADH", at: 2.0, from: "mid" },
  { kind: "NADH", at: 7.2, from: "a" },
  { kind: "NADH", at: 7.2, from: "b" },
  { kind: "NADH", at: 10.4, from: "a" },
  { kind: "NADH", at: 10.4, from: "b" },
  { kind: "NADH", at: 12.0, from: "a" },
  { kind: "NADH", at: 12.0, from: "b" },
  { kind: "FADH2", at: 13.4, from: "a" },
  { kind: "FADH2", at: 13.4, from: "b" },
  { kind: "NADH", at: 14.6, from: "a" },
  { kind: "NADH", at: 14.6, from: "b" },
];
const FLY = 0.8; // s for an electron pair to reach its carrier
// CO2 leaving: [time, half] — one per half at stage 3, two per piece in the loop
const CO2S = [
  { at: 7.0, from: "a" }, { at: 7.0, from: "b" },
  { at: 10.0, from: "a" }, { at: 10.0, from: "b" },
  { at: 12.8, from: "a" }, { at: 12.8, from: "b" },
];
// ATP: two in glycolysis, one per turn
const ATPS = [
  { at: 1.0, from: "mid", dx: -50 }, { at: 1.0, from: "mid", dx: 50 },
  { at: 15.2, from: "a", dx: 0 }, { at: 15.2, from: "b", dx: 0 },
];

function layout(wide) {
  if (wide) {
    const carriers = Array.from({ length: 12 }, (_, i) => [56 + i * 79, 420]);
    return {
      w: 980, h: 460, sw: 70, fluid: [10, 10, 960, 340],
      chain: { x0: 90, y: 175, dx: 40 },
      mito: { cx: 715, cy: 175, rx: 248, ry: 150 },
      track: { cx: 750, cy: 175, r: 92 },
      entry: [[540, 140], [540, 212]],
      carriers,
      labels: [["Cell fluid", 24, 40, "start"], ["Mitochondrion", 950, 40, "end"], ["Krebs cycle", 750, 181, "middle"]],
      small: false,
    };
  }
  const carriers = Array.from({ length: 12 }, (_, i) => [31 + (i % 6) * 58, i < 6 ? 548 : 608]);
  return {
    w: 354, h: 640, sw: 54, fluid: [2, 2, 350, 500],
    chain: { x0: 77, y: 70, dx: 40 },
    mito: { cx: 177, cy: 318, rx: 168, ry: 150 },
    track: { cx: 177, cy: 340, r: 80 },
    entry: [[120, 222], [234, 222]],
    carriers,
    labels: [["Cell fluid", 10, 26, "start"], ["Mitochondrion", 177, 196, "middle"], ["Krebs cycle", 177, 346, "middle"]],
    small: true,
  };
}

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const counter = fig.querySelector(`#${P}-counter`);
  // spoken only: the brief gives this figure no visible captions
  const caption = fig.querySelector(`#${P}-status`);
  const stepBtn = fig.querySelector(`#${P}-step`);
  let L;
  let parts;
  let figure;

  function build() {
    const wide = fig.clientWidth >= 640;
    if (L && L.wide === wide) return;
    L = { ...layout(wide), wide };
    for (const c of [...svg.children]) c.remove();
    svg.setAttribute("width", L.w);
    svg.setAttribute("height", L.h);
    svg.setAttribute("viewBox", `0 0 ${L.w} ${L.h}`);
    const ts = L.small ? "t-small" : "";
    const defs = el("defs", {}, svg);
    const cp = el("clipPath", { id: `${P}-clip` }, defs);
    el("rect", { x: 0, y: 0, width: L.w, height: L.h }, cp);

    // context: the cell's fluid, the mitochondrion, the loop's track
    const [fx, fy, fw, fh] = L.fluid;
    el("rect", { x: fx, y: fy, width: fw, height: fh, rx: 30, class: "f-muted", id: `${P}-fluid` }, svg);
    const m = L.mito;
    el("ellipse", { cx: m.cx, cy: m.cy, rx: m.rx, ry: m.ry, class: "f-paper l-muted w3", id: `${P}-mito` }, svg);
    el("circle", { cx: L.track.cx, cy: L.track.cy, r: L.track.r, class: "l-muted w3", id: `${P}-track` }, svg);
    // the loop runs one way: a small arrowhead on the track
    {
      const a = -Math.PI / 4;
      const x = L.track.cx + L.track.r * Math.cos(a);
      const y = L.track.cy + L.track.r * Math.sin(a);
      el("path", { d: "M-8 -7L2 0L-8 7", class: "l-muted w3", transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 180) / Math.PI + 90})` }, svg);
    }
    for (const [words, x, y, anchor] of L.labels) {
      el("text", { x, y, "text-anchor": anchor, class: ts }, svg).textContent = words;
    }

    // carriers: shuttles in a row along the bottom
    const carriers = L.carriers.map(([x, y], i) => {
      const g = el("g", { id: `${P}-carrier-${i + 1}`, transform: `translate(${x} ${y})` }, svg);
      el("rect", { x: -L.sw / 2, y: -15, width: L.sw, height: 30, rx: 14, class: "f-subject l-subject w25" }, g);
      el("text", { x: 0, y: 5, "text-anchor": "middle", class: "t-small" }, g).textContent = CARRIERS[i].kind;
      return g;
    });

    // moving things
    const movers = el("g", { "clip-path": `url(#${P}-clip)` }, svg);
    // the six carbons: bonds then beads
    const bonds = [0, 1, 2, 3, 4].map((i) => el("path", { id: `${P}-bond-${i + 1}`, class: "l-subject w3" }, movers));
    const beads = [0, 1, 2, 3, 4, 5].map((i) => {
      const b = el("g", { id: `${P}-carbon-${i + 1}` }, movers);
      el("circle", { cx: 0, cy: 0, r: 16, class: "f-subject l-subject w3" }, b);
      return b;
    });
    const pairs = CARRIERS.map((_, i) => particle(movers, "e2", { id: `${P}-pair-${i + 1}` }));
    const co2s = CO2S.map((_, i) => particle(movers, "co2", { id: `${P}-co2-${i + 1}` }));
    const atps = ATPS.map((_, i) => atpCompact(movers, 0, 0, 3, { id: `${P}-atp-${i + 1}` }));
    parts = { carriers, bonds, beads, pairs, co2s, atps };
    if (figure) figure.dirty = true;
  }

  // where each carbon is at time u (0..19), and whether it is still there
  function carbonPos(i, u) {
    const c = L.chain;
    const home = [c.x0 + i * c.dx, c.y];
    const half = i < 3 ? 0 : 1; // which half
    const k = i % 3; // place in its half: 0 is the one that leaves first
    const split = ease(u, 0.2, 1.2);
    const sep = L.wide ? [0, -30, 30] : [0, -26, 26];
    let x = home[0] + (half ? 1 : -1) * split * 14;
    let y = home[1] + sep[half + 1] * split;
    // stage 2: into the mitochondrion (3.5–5.5)
    const go = ease(u, 3.6, 5.5);
    const ent = L.entry[half];
    // each half lines up at its entry point: in a row (wide), a column (phone)
    x = lerp(x, L.wide ? ent[0] + (k - 1) * 36 : ent[0], go);
    y = lerp(y, L.wide ? ent[1] : ent[1] + (k - 1) * 34, go);
    // stage 4: the two remaining beads ride the loop (9.2–15.6)
    const ride = ease(u, 9.2, 10.0);
    if (k > 0 && ride > 0) {
      const t0 = L.track;
      const start = half ? 0 : Math.PI; // a on the left, b on the right
      const turn = Math.max(0, Math.min(1, (u - 10.0) / 5.4));
      const a = start + turn * 2 * Math.PI + (k === 1 ? 0 : -0.34);
      const px = t0.cx + t0.r * Math.cos(a);
      const py = t0.cy + t0.r * Math.sin(a);
      x = lerp(x, px, ride);
      y = lerp(y, py, ride);
    }
    // when does it leave as CO2? k = 0 at 7.0 (stage 3); k = 1, 2 in the loop
    const leave = k === 0 ? 7.0 : k === 1 ? 10.0 : 12.8;
    // in the loop, a bead leaves wherever the piece is
    return { x, y, gone: u >= leave, leave };
  }

  // the place a half or piece is, for things that leave it
  function spot(from, u) {
    if (from === "mid") return [L.chain.x0 + 2.5 * L.chain.dx, L.chain.y];
    const half = from === "a" ? 0 : 1;
    // the first bead still present in that half
    for (const k of [0, 1, 2]) {
      const p = carbonPos(half * 3 + k, u);
      if (!p.gone) return [p.x, p.y];
    }
    const last = carbonPos(half * 3 + 2, u - 0.01);
    return [last.x, last.y];
  }

  function draw(t) {
    const u = t % LOOP;
    const p = parts;
    // carbons
    const pos = p.beads.map((b, i) => {
      const c = carbonPos(i, u);
      b.setAttribute("transform", `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`);
      b.style.display = c.gone ? "none" : "";
      return c;
    });
    // bonds: within the chain; the middle bond breaks at the split
    p.bonds.forEach((bd, i) => {
      const a = pos[i];
      const b = pos[i + 1];
      const broken = (i === 2 && u >= 0.3) || a.gone || b.gone;
      bd.style.display = broken ? "none" : "";
      if (!broken) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        bd.setAttribute("d", `M${(a.x + (dx / d) * 16).toFixed(1)} ${(a.y + (dy / d) * 16).toFixed(1)}L${(b.x - (dx / d) * 16).toFixed(1)} ${(b.y - (dy / d) * 16).toFixed(1)}`);
      }
    });
    // CO2: the carbon bead becomes a CO2 mark and drifts up and out
    let co2Out = 0;
    CO2S.forEach((c, i) => {
      const m = p.co2s[i];
      const s = u - c.at;
      const on = s >= 0 && s < 2.4;
      if (s >= 0) co2Out++;
      m.g.style.display = on ? "" : "none";
      if (on) {
        const half = c.from === "a" ? 0 : 1;
        const k = i < 2 ? 0 : i < 4 ? 1 : 2;
        const b = carbonPos(half * 3 + k, c.at - 0.01);
        const q = ease(s, 0, 2.4);
        m.place(b.x + Math.sin(q * 6 + i) * 10, lerp(b.y, -40, q), null, true);
      }
    });
    // carriers: the electron pair flies to its shuttle, then sits on top
    let loaded = 0;
    CARRIERS.forEach((c, i) => {
      const m = p.pairs[i];
      const s = u - c.at;
      const [tx, ty] = L.carriers[i];
      const seat = [tx, ty - 26];
      if (s < 0) {
        m.g.style.display = "none";
        return;
      }
      loaded++;
      m.g.style.display = "";
      const q = ease(s, 0, FLY);
      const from = spot(c.from, c.at);
      m.place(lerp(from[0], seat[0], q), lerp(from[1], seat[1], q), 90, q < 1);
    });
    // ATP pops out and floats up
    let atpMade = 0;
    ATPS.forEach((a, i) => {
      const g = p.atps[i].g;
      const s = u - a.at;
      if (s >= 0) atpMade++;
      const on = s >= 0 && s < 2.0;
      g.style.display = on ? "" : "none";
      if (on) {
        const [x, y] = spot(a.from, a.at);
        const q = ease(s, 0, 2.0);
        g.setAttribute("transform", `translate(${(x + a.dx - 26).toFixed(1)} ${lerp(y - 56, -30, q).toFixed(1)})`);
      }
    });
    const left = pos.filter((c) => !c.gone).length;
    const text = `Carbons left ${left} · CO2 out ${co2Out} · ATP made ${atpMade} · Carriers loaded ${loaded}`;
    if (counter.textContent !== text) counter.textContent = text;
    const k = stageAt(u);
    const cap = t <= 0.001 ? "" : CAPS[k];
    if (caption.textContent !== cap) caption.textContent = cap;
  }

  const CAPS = [
    "Glycolysis: glucose splits in two; 2 ATP are made and 2 carriers load.",
    "The two halves move into a mitochondrion.",
    "Each half drops one carbon as CO2, and a carrier loads.",
    "The Krebs cycle: each piece drops its last two carbons as CO2; carriers load and 1 ATP is made per turn.",
    "All six carbons have left as CO2, and twelve carriers are full.",
  ];
  const stageAt = (u) => {
    for (let k = 4; k >= 0; k--) if (u >= ST[k]) return k;
    return 0;
  };

  build();
  figure = new Figure(fig, { draw });
  figure.selfPaused = true; // the text says: Press Step
  figure.syncButtons();
  new ResizeObserver(build).observe(fig);
  stepBtn.addEventListener("click", () => {
    figure.selfPaused = true;
    figure.syncButtons();
    const loops = Math.floor(figure.t / LOOP);
    const u = figure.t - loops * LOOP;
    const k = figure.t < 0.001 ? -1 : stageAt(u);
    const next = k + 1;
    figure.t = loops * LOOP + (next >= 5 ? LOOP : ST[next]);
    figure.busyUntil = figure.t;
    const len = next >= 5 ? ST[1] : ST[next + 1] - ST[next];
    figure.act(len - 0.02);
  });
}
