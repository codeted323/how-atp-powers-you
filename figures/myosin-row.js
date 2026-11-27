// Figure 3.1 · myosin-row · 980 × 420 (phone: cropped to the subject head)
// An actin strand across the top (context, a twisted bead chain) and the
// myosin filament below (context). One head with its lever arm is the
// subject; its neighbors are context and hold still. ATP is the compact
// three-bead mark. A four-stage cycle, 9 s a loop when playing:
//   1 ATP flies into the head's pocket and the head lifts off
//   2 the head tilts back (cocks) and the ATP splits
//   3 the head grips actin one step along
//   4 the phosphate leaves as the head swings, the actin slides one step,
//     then the ADP leaves
// Step walks one stage; arriving at stage 4 by Step flashes the head.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, atpCompact } from "../assets/js/marks.js";

const LOOP = 9;
const STAGE = LOOP / 4; // 2.25 s
const CAPTIONS = [
  "ATP binds: the head lets go",
  "ATP is split: the head cocks",
  "The head grabs actin",
  "Phosphate leaves: the power stroke",
];
const PIVOT = [490, 334]; // where the lever leaves the filament
const SWING = 15; // degrees either side of upright
const BOUND = 174; // lever length when the head grips actin
const FREE = 146; // when it has let go
const STEP = 2 * BOUND * Math.sin((SWING * Math.PI) / 180); // actin moves this far per stroke
const BEAD = STEP / 2; // the actin's bead period

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const caption = fig.querySelector(`#${P}-caption`);
  const stepBtn = fig.querySelector(`#${P}-step`);
  svg.setAttribute("aria-describedby", `${P}-caption`);

  // ---- the drawing (built once; the phone crops it) ----
  for (const n of [...svg.children]) n.remove();
  const clip = el("clipPath", { id: `${P}-clip` }, el("defs", {}, svg));
  el("rect", { x: 0, y: 0, width: 980, height: 420 }, clip);

  // actin: two rows of beads, offset by half a period: a twisted chain
  const actin = el("g", { id: `${P}-actin`, "clip-path": `url(#${P}-clip)` }, svg);
  const actinBeads = el("g", {}, actin);
  for (let i = -8; i < 980 / BEAD + 8; i++) {
    const x = i * BEAD;
    el("circle", { cx: x, cy: 78, r: 15, class: "f-muted l-muted w25" }, actinBeads);
    el("circle", { cx: x + BEAD / 2, cy: 100, r: 15, class: "f-muted l-muted w25" }, actinBeads);
    // an ink dot on every sixth bead, so the strand's slide can be seen
    if (((i % 6) + 6) % 6 === 0) el("circle", { cx: x, cy: 78, r: 4, class: "d-ink" }, actinBeads);
  }

  // the thick filament
  el("rect", { x: 30, y: PIVOT[1], width: 920, height: 34, rx: 17, class: "f-muted l-muted w3", id: `${P}-filament` }, svg);

  // a head: lever (a narrow bar) and a rounded head with a pocket
  function head(parent, cls, id) {
    const g = el("g", { id }, parent);
    const lever = el("rect", { x: -7, y: 0, width: 14, height: 10, rx: 7, class: `${cls.face} ${cls.line} w3` }, g);
    const h = el("g", {}, g);
    el("path", {
      d: "M-34 0 C-34 -30 -18 -46 0 -46 C18 -46 34 -30 34 0 C34 10 30 18 22 22 L10 14 L-2 22 C-20 24 -34 16 -34 0 Z",
      class: `${cls.face} ${cls.line} w3`,
    }, h);
    return { g, lever, h };
  }
  const ctx = { face: "f-muted", line: "l-muted" };
  const neighbors = [-390, -260, -130, 130, 260, 390].map((dx, i) => {
    const n = head(svg, ctx, `${P}-neighbor-${i + 1}`);
    const ang = [-12, 8, -4, 10, -8, 6][i];
    placeHead(n, PIVOT[0] + dx, ang, FREE - 6);
    return n;
  });
  void neighbors;
  const subj = head(svg, { face: "f-subject", line: "l-subject" }, `${P}-head`);

  // the nucleotide in the pocket: compact ATP; its end bead is the phosphate
  const nuc = atpCompact(svg, 0, 0, 3, { id: `${P}-atp` });
  const pi = nuc.beads[2];

  function placeHead(hd, px, angle, len) {
    // the lever rises from (px, PIVOT y) at `angle` from upright
    hd.lever.setAttribute("height", len);
    hd.lever.setAttribute("y", -len);
    hd.g.setAttribute("transform", `translate(${px} ${PIVOT[1]}) rotate(${angle.toFixed(2)})`);
    hd.h.setAttribute("transform", `translate(0 ${-len + 4})`);
  }
  // the pocket, in page coordinates, for a head pose
  function pocket(angle, len) {
    const a = (angle * Math.PI) / 180;
    const lx = 10;
    const ly = -len + 4 + 6; // just under the head's lower right
    return [PIVOT[0] + lx * Math.cos(a) - ly * Math.sin(a), PIVOT[1] + lx * Math.sin(a) + ly * Math.cos(a)];
  }

  // ---- the state at time t ----
  function draw(t) {
    const loops = Math.floor(t / LOOP);
    const u = t - loops * LOOP; // time in this loop
    const k = Math.min(3, Math.floor(u / STAGE)); // stage 0..3 (= 1..4)
    const s = u - k * STAGE; // time in the stage

    let angle; // lever angle
    let len; // lever length
    let slide = 0; // actin slide this loop, 0..1
    let nucIn = 1; // 0 = still flying in, 1 = in the pocket
    let split = 0; // ATP split: 0..1
    let piOut = 0; // phosphate gone: 0..1
    let adpOut = 0; // ADP gone: 0..1
    if (k === 0) {
      nucIn = ease(s, 0, 0.8);
      angle = SWING;
      len = lerp(BOUND, FREE, ease(s, 0.8, 1.4));
    } else if (k === 1) {
      angle = lerp(SWING, -SWING, ease(s, 0, 1.0));
      len = FREE;
      split = ease(s, 1.0, 1.4);
    } else if (k === 2) {
      angle = -SWING;
      len = lerp(FREE, BOUND, ease(s, 0, 0.9));
      split = 1;
    } else {
      piOut = ease(s, 0, 0.8);
      angle = lerp(-SWING, SWING, ease(s, 0.15, 1.15));
      len = BOUND;
      slide = ease(s, 0.15, 1.15);
      split = 1;
      adpOut = ease(s, 1.3, 1.95);
    }
    // before the first step there is no nucleotide yet: the head is in rigor
    placeHead(subj, PIVOT[0], angle, len);

    // actin: slides right one STEP per stroke, wrapping by its period
    const shift = ((loops + slide) * STEP) % (6 * BEAD);
    actinBeads.setAttribute("transform", `translate(${shift.toFixed(2)} 0)`);

    // the nucleotide
    const [px, py] = pocket(angle, len);
    let nx = px;
    let ny = py;
    if (k === 0) {
      nx = lerp(PIVOT[0] + 210, px, nucIn);
      ny = lerp(PIVOT[1] + 60, py, nucIn) - Math.sin(nucIn * Math.PI) * 30;
    }
    if (k === 3) {
      nx = lerp(px, px + 160, adpOut);
      ny = lerp(py, py + 150, adpOut);
    }
    const hideNuc = (k === 0 && u < 0.001 && t < 0.001) || adpOut >= 1;
    nuc.g.style.display = hideNuc ? "none" : "";
    nuc.g.setAttribute("transform", `translate(${(nx - 26).toFixed(2)} ${ny.toFixed(2)}) rotate(${(angle * 0.5).toFixed(1)})`);
    // the end bead: split off a little, then leaves first in stage 4
    const pdx = split * 7 + piOut * -150;
    const pdy = piOut * 170;
    pi.setAttribute("transform", `translate(${pdx.toFixed(2)} ${pdy.toFixed(2)})`);
    pi.style.display = piOut >= 1 ? "none" : "";
    const bond = pi.querySelector("path");
    if (bond) bond.style.display = split > 0.5 ? "none" : "";

    // the caption follows the stage once the cycle has begun
    const text = t > 0.001 ? CAPTIONS[k] : "";
    if (caption.textContent !== text) caption.textContent = text;
  }

  const figure = new Figure(fig, { draw });
  // the reader starts it: Play or Step
  figure.selfPaused = true;
  figure.syncButtons();

  stepBtn.addEventListener("click", () => {
    figure.selfPaused = true;
    figure.syncButtons();
    const loops = Math.floor(figure.t / LOOP);
    const u = figure.t - loops * LOOP;
    const k = Math.min(3, Math.floor(u / STAGE));
    // from the start (t = 0, nothing yet) a step plays stage 1
    const next = figure.t < 0.001 ? 0 : k + 1;
    figure.t = loops * LOOP + next * STAGE;
    figure.busyUntil = figure.t;
    figure.act(STAGE - 0.05);
    if (next % 4 === 3) figure.flash(subj.g, { byReader: true });
  });

  // phone: crop to the subject head so it stays large
  const crop = () => {
    const narrow = fig.clientWidth < 640;
    svg.setAttribute("viewBox", narrow ? "250 40 480 380" : "0 0 980 420");
    svg.setAttribute("width", narrow ? 480 : 980);
    svg.setAttribute("height", narrow ? 380 : 420);
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
