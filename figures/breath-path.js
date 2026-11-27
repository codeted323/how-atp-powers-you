// Figure 5.1 · breath-path · 980 × 360 (phone: the same strip run top to
// bottom, 354 × 584)
// A left-to-right strip of five stations (all context): an air sac, a lung
// blood vessel with red blood cells, a long vessel, a body cell, and a
// mitochondrion inside it. Blood runs out to the body in the upper vessel
// and back in the lower one. Hemoglobin is a small four-seat shape inside
// each red blood cell (subject). Oxygen and carbon dioxide are flow marks;
// in the blood, carbon dioxide travels as bicarbonate (the dashed mark) and
// changes back near the air sac.
// Breathe: one oxygen crosses into the blood, takes a seat on hemoglobin,
// rides along, gets off, drifts into the cell and reaches the mitochondrion
// (8 s); then one carbon dioxide makes the reverse trip (7 s).
// Idle: a slow background trickle of both on a 17 s loop.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle } from "../assets/js/marks.js";

const TRICKLE = 17;
const OUT = { y0: 104, y1: 160 }; // the upper vessel (to the body)
const BACK = { y0: 204, y1: 260 }; // the lower vessel (back to the lungs)
const VX = [196, 704]; // vessels run between these
const MITO = [862, 184];
const BREATHE = 15;

// red blood cell with its hemoglobin: (0, 0) is the cell's center
function redCell(parent, id) {
  const g = el("g", { id }, parent);
  el("ellipse", { cx: 0, cy: 0, rx: 36, ry: 21, class: "f-paper l-muted w25" }, g);
  const hb = el("g", { class: "hb" }, g);
  // hemoglobin: a bar with four seat-backs, like a small bus
  el("rect", { x: -20, y: 0, width: 40, height: 11, rx: 4, class: "f-subject l-subject w25" }, hb);
  for (const sx of [-15, -5, 5, 15]) el("path", { d: `M${sx - 3} 0V-6`, class: "l-subject w2" }, hb);
  return { g, seats: [-15, -5, 5, 15].map((sx) => [sx + 1, -10]) };
}

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const status = fig.querySelector(`#${P}-status`) || fig.querySelector(`#${P}-caption`);
  const breatheBtn = fig.querySelector(`#${P}-breathe`);
  let narrow = null;
  let parts;
  let figure;
  const state = { at: null };

  function build() {
    const n = fig.clientWidth < 640;
    if (n === narrow) return;
    narrow = n;
    for (const c of [...svg.children]) c.remove();
    const W = narrow ? 354 : 980;
    const H = narrow ? 584 : 360;
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const defs = el("defs", {}, svg);
    // the world is drawn along the strip; a phone runs it top to bottom
    // (a transpose: the outward vessel on the left, the return on the right)
    const S = 0.58;
    const E = 104 - 40 * S;
    const world = el("g", { id: `${P}-world`, transform: narrow ? `matrix(0 ${S} ${S} 0 ${E} 6)` : "" }, svg);
    const map = (u, v) => (narrow ? [E + v * S, 6 + u * S] : [u, v]);

    // context: air sac, two vessels, body cell, mitochondrion
    el("path", {
      d: "M196 92 C176 40 120 40 92 58 C40 64 24 120 36 170 C20 230 52 296 110 300 C160 312 190 290 196 264",
      class: "f-paper l-muted w3", id: `${P}-sac`,
    }, world);
    for (const [k, v] of [["out", OUT], ["back", BACK]]) {
      el("rect", { x: VX[0], y: v.y0, width: VX[1] - VX[0], height: v.y1 - v.y0, class: "f-muted", id: `${P}-vessel-${k}` }, world);
      el("path", { d: `M${VX[0]} ${v.y0}H${VX[1]}M${VX[0]} ${v.y1}H${VX[1]}`, class: "l-muted w3" }, world);
      const cp = el("clipPath", { id: `${P}-clip-${k}` }, defs);
      el("rect", { x: VX[0], y: v.y0, width: VX[1] - VX[0], height: v.y1 - v.y0 }, cp);
    }
    el("rect", { x: 704, y: 56, width: 250, height: 256, rx: 40, class: "f-muted l-muted w3", id: `${P}-cell` }, world);
    el("ellipse", { cx: MITO[0], cy: MITO[1], rx: 62, ry: 32, class: "f-paper l-muted w3", id: `${P}-mito` }, world);
    el("path", { d: `M${MITO[0] - 44} ${MITO[1]} q10 -22 20 0 t20 0 t20 0 t20 0`, class: "l-muted w2" }, world);

    // red cells in both vessels (clipped to them)
    const outG = el("g", { "clip-path": `url(#${P}-clip-out)` }, world);
    const backG = el("g", { "clip-path": `url(#${P}-clip-back)` }, world);
    const outCells = [0, 1, 2, 3].map((i) => {
      const c = redCell(outG, `${P}-rbc-out-${i + 1}`);
      // each carries a few oxygen in its seats
      c.o2 = [0, 2].map((j) => {
        const m = particle(c.g, "o2", { id: `${P}-rbc-out-${i + 1}-o2-${j + 1}`, scale: 0.55, upright: true });
        m.place(c.seats[j][0], c.seats[j][1] - 3, 0, false);
        return m;
      });
      return c;
    });
    const backCells = [0, 1, 2, 3].map((i) => redCell(backG, `${P}-rbc-back-${i + 1}`));
    const hco3 = [0, 1, 2].map((i) => particle(backG, "hco3", { id: `${P}-hco3-${i + 1}`, upright: true }));
    // trickle in the cell and the sac
    const cellO2 = [0, 1].map((i) => particle(world, "o2", { id: `${P}-cell-o2-${i + 1}` }));
    const cellCO2 = [0, 1].map((i) => particle(world, "co2", { id: `${P}-cell-co2-${i + 1}` }));
    const sacO2 = [0, 1].map((i) => particle(world, "o2", { id: `${P}-sac-o2-${i + 1}` }));
    const sacCO2 = [0, 1].map((i) => particle(world, "co2", { id: `${P}-sac-co2-${i + 1}` }));

    // the featured trip (Breathe)
    const fCell = redCell(outG, `${P}-rbc-featured`);
    const fBack = el("g", {}, world);
    const fO2 = particle(world, "o2", { id: `${P}-o2` });
    const fCO2 = particle(fBack, "co2", { id: `${P}-co2` });
    const fHCO3 = particle(fBack, "hco3", { id: `${P}-hco3`, upright: true });

    // labels (outside the world, so they stay upright)
    const L = el("g", { id: `${P}-labels` }, svg);
    const lab = (wide, nar, words, anchor = "start") => {
      const [x, y] = narrow ? nar : wide;
      const t = el("text", { x, y, "text-anchor": narrow ? nar[2] || "start" : anchor, class: narrow ? "t-small" : "" }, L);
      t.textContent = words;
      return t;
    };
    lab([62, 334], [4, 64], "Air sac");
    lab([450, 188], [4, 300], "Blood", "middle");
    lab([214, 92], [4, 200], "Oxygen in");
    if (narrow) {
      lab(null, [270, 196], "CO2 out,");
      lab(null, [270, 216], "mostly as");
      lab(null, [270, 236], "bicarbonate");
      // Blood's leader, to the outward vessel
      el("path", { d: `M48 295H${(map(0, OUT.y0)[0] - 10).toFixed(1)}`, class: "l-ink w4" }, L);
    } else {
      lab([214, 286], null, "CO2 out, mostly as bicarbonate");
    }
    lab([954, 340], [270, 548], "Body cell", "end");
    lab([862, 284], [4, 482], "Mitochondrion", "middle");
    // the mitochondrion's leader
    if (narrow) {
      const m = map(MITO[0], MITO[1] + 32);
      el("path", { d: `M106 476H${(m[0] - 32 * S - 10).toFixed(1)}`, class: "l-ink w4" }, L);
    } else {
      el("path", { d: `M${MITO[0]} 262V${MITO[1] + 32 + 10}`, class: "l-ink w4" }, L);
    }
    // a key for hemoglobin, drawn large
    const key = el("g", { id: `${P}-key`, transform: narrow ? "translate(28 374)" : "translate(470 36)" }, L);
    el("rect", { x: -20, y: -6, width: 40, height: 11, rx: 4, class: "f-subject l-subject w25" }, key);
    for (const sx of [-15, -5, 5, 15]) el("path", { d: `M${sx - 3} -6V-12`, class: "l-subject w2" }, key);
    const kt = el("text", { x: narrow ? -24 : 30, y: narrow ? 26 : 5, class: narrow ? "t-small" : "" }, key);
    if (narrow) {
      el("tspan", { x: -24, dy: 0 }, kt).textContent = "Hemoglobin:";
      el("tspan", { x: -24, dy: "1.2em" }, kt).textContent = "four seats";
    } else {
      kt.textContent = "Hemoglobin: four seats";
    }

    parts = { outCells, backCells, hco3, cellO2, cellCO2, sacO2, sacCO2, fCell, fO2, fCO2, fHCO3 };
    if (figure) figure.dirty = true;
  }

  function draw(t) {
    const p = parts;
    const s = state.at === null ? -1 : t - state.at;
    const trip = s >= 0 && s < BREATHE;

    // ---- the trickle (hidden while a featured trip runs) ----
    const tr = (t % TRICKLE) / TRICKLE;
    const span = VX[1] - VX[0] + 100;
    p.outCells.forEach((c, i) => {
      const x = VX[0] - 50 + ((tr + i / 4) % 1) * span;
      c.g.setAttribute("transform", `translate(${x.toFixed(1)} ${(OUT.y0 + OUT.y1) / 2 + 2})`);
      c.g.style.display = trip ? "none" : "";
    });
    p.backCells.forEach((c, i) => {
      const x = VX[1] + 50 - ((tr + i / 4 + 0.12) % 1) * span;
      c.g.setAttribute("transform", `translate(${x.toFixed(1)} ${(BACK.y0 + BACK.y1) / 2 + 2})`);
    });
    p.hco3.forEach((m, i) => {
      const x = VX[1] + 30 - ((tr + i / 3 + 0.05) % 1) * (span - 40);
      m.place(x, BACK.y0 + 16 + (i % 2) * 22, 180, true);
      m.g.style.display = trip ? "none" : "";
    });
    const loopPath = (m, a, b, k, phase, shown = true) => {
      const q = (tr * 2 + phase) % 1;
      m.place(lerp(a[0], b[0], q), lerp(a[1], b[1], q) + Math.sin(q * 9 + k) * 6, null, true);
      m.g.style.display = trip || !shown ? "none" : "";
    };
    p.cellO2.forEach((m, i) => loopPath(m, [712, 120 + i * 20], [MITO[0] - 66, MITO[1] - 10 + i * 18], i, i / 2));
    p.cellCO2.forEach((m, i) => loopPath(m, [MITO[0] - 30, MITO[1] + 34 + i * 8], [712, 236 + i * 14], i + 2, i / 2 + 0.25));
    p.sacO2.forEach((m, i) => loopPath(m, [70, 110 + i * 40], [190, 130], i, i / 2 + 0.1, i === 0));
    p.sacCO2.forEach((m, i) => loopPath(m, [190, 232], [60, 150 + i * 60], i + 1, i / 2 + 0.6, i === 0));

    // ---- the featured oxygen (0–8 s) ----
    const rbcY = (OUT.y0 + OUT.y1) / 2 + 2;
    const rideX = lerp(250, 660, ease(s, 1.8, 5.2));
    p.fCell.g.style.display = trip ? "" : "none";
    p.fCell.g.setAttribute("transform", `translate(${(trip ? rideX : -200).toFixed(1)} ${rbcY})`);
    const seat = [rideX + p.fCell.seats[0][0], rbcY + p.fCell.seats[0][1] - 3];
    let ox;
    let oy;
    let scale = 1;
    if (s < 1.2) {
      const q = ease(s, 0, 1.2);
      ox = lerp(110, 214, q);
      oy = lerp(150, 132, q) + Math.sin(q * 8) * 8;
    } else if (s < 1.8) {
      const q = ease(s, 1.2, 1.8);
      ox = lerp(214, seat[0], q);
      oy = lerp(132, seat[1], q);
      scale = lerp(1, 0.55, q);
    } else if (s < 5.2) {
      ox = seat[0];
      oy = seat[1];
      scale = 0.55;
    } else if (s < 5.8) {
      const q = ease(s, 5.2, 5.8);
      ox = lerp(seat[0], 716, q);
      oy = lerp(seat[1], 124, q);
      scale = lerp(0.55, 1, q);
    } else {
      const q = ease(s, 5.8, 8);
      ox = lerp(716, MITO[0] - 72, q);
      oy = lerp(124, MITO[1] - 8, q) + Math.sin(q * 7) * 6;
    }
    p.fO2.g.style.display = trip && s < 8.4 ? "" : "none";
    if (trip) {
      p.fO2.place(ox, oy, null, s < 1.2 || s > 5.2);
      if (scale !== 1) p.fO2.g.setAttribute("transform", p.fO2.g.getAttribute("transform") + ` scale(${scale})`);
    }

    // ---- the featured carbon dioxide (8–15 s) ----
    const c = s - 8;
    let cx;
    let cy;
    let asBicarb = false;
    if (c < 1.6) {
      const q = ease(c, 0, 1.6);
      cx = lerp(MITO[0] - 20, 690, q);
      cy = lerp(MITO[1] + 30, 230, q) + Math.sin(q * 6) * 5;
    } else if (c < 5.8) {
      const q = ease(c, 2.0, 5.4);
      cx = lerp(690, 226, q);
      cy = 230;
      asBicarb = c >= 1.8 && c < 5.6;
    } else {
      const q = ease(c, 5.8, 7);
      cx = lerp(226, 70, q);
      cy = lerp(230, 70, q) + Math.sin(q * 5) * 6;
    }
    const cOn = trip && c >= 0;
    p.fCO2.g.style.display = cOn && !asBicarb ? "" : "none";
    p.fHCO3.g.style.display = cOn && asBicarb ? "" : "none";
    if (cOn) {
      p.fCO2.place(cx, cy, null, true);
      p.fHCO3.place(cx, cy, 180, c > 2.0 && c < 5.4);
    }

    const note = !trip ? "" :
      s < 1.2 ? "An oxygen molecule crosses from the air sac into the blood." :
      s < 1.8 ? "It takes a seat on hemoglobin." :
      s < 5.2 ? "It rides the blood toward the body." :
      s < 8 ? "It gets off, drifts into the cell and reaches a mitochondrion." :
      c < 1.8 ? "A carbon dioxide molecule leaves the mitochondrion and the cell." :
      c < 5.6 ? "In the blood it travels dissolved, as bicarbonate." :
      "Near the air sac it turns back into carbon dioxide and is breathed out.";
    if (status && status.textContent !== note) status.textContent = note;
  }

  build();
  figure = new Figure(fig, { draw });
  new ResizeObserver(build).observe(fig);
  breatheBtn.addEventListener("click", () => {
    if (state.at !== null && figure.t - state.at < BREATHE) return;
    state.at = figure.act(BREATHE);
  });
}
