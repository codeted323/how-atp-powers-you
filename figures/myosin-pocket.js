// Figure 3.2 · myosin-pocket · 900 × 440 (phone: cropped, larger labels)
// Schematic, not to scale. A strand of actin (context beads) along the top;
// one myosin head (subject) below it, with a cleft at its top that closes on
// the actin and a pocket at its lower right, lined with plus marks, with two
// loops at its mouth. ATP is the compact mark with a minus on each bead, and
// Mg²⁺ rides beside its last two beads.
//   Load ATP (3 s): the ATP drops into the pocket, the loops swing in (they
//   flash), a bend runs up through the head (dashed, flow color) and the
//   cleft opens; the head drops away from the actin.
//   Empty (2.4 s): the pieces leave, the loops swing open, and the head
//   rises and grips the actin again as the cleft closes.
import { Figure, ease, lerp, clamp } from "../assets/js/figure.js";
import { el, atpCompact } from "../assets/js/marks.js";

const LOAD = 3.0;
const EMPTY = 2.4;
const CX = 450;
const TOP = 100; // the head's top when it grips
const DROP = 30;
const BEAD = 44;

function headPath(T, hw) {
  const p = (x, y) => `${x} ${(T + y).toFixed(1)}`;
  return (
    `M${p(CX - hw, 0)}` +
    `C${p(380, -4)} ${p(300, 10)} ${p(290, 90)}` +
    `C${p(280, 170)} ${p(320, 250)} ${p(420, 262)}` +
    `C${p(466, 268)} ${p(500, 262)} ${p(518, 252)}` +
    // into the pocket and out: its mouth faces down and right
    `C${p(512, 222)} ${p(530, 180)} ${p(560, 180)}` +
    `C${p(592, 180)} ${p(610, 206)} ${p(602, 236)}` +
    `C${p(614, 206)} ${p(618, 170)} ${p(614, 140)}` +
    `C${p(608, 70)} ${p(560, -2)} ${p(CX + hw, 0)}` +
    `L${p(CX, 96)}Z`
  );
}

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const status = fig.querySelector(`#${P}-status`);
  const btn = fig.querySelector(`#${P}-load`);
  const [wLoad, wEmpty] = btn.querySelectorAll("span");
  for (const n of [...svg.children]) n.remove();

  // actin: two offset rows of beads
  const actin = el("g", { id: `${P}-actin` }, svg);
  for (let i = -1; i < 900 / BEAD + 1; i++) {
    el("circle", { cx: i * BEAD, cy: 62, r: 15, class: "f-muted l-muted w25" }, actin);
    el("circle", { cx: i * BEAD + BEAD / 2, cy: 84, r: 15, class: "f-muted l-muted w25" }, actin);
  }

  const leaders = el("g", { id: `${P}-leaders` }, svg);
  const headG = el("g", { id: `${P}-head` }, svg);
  const head = el("path", { class: "f-subject l-subject w3" }, headG);
  const pluses = [
    [500, 318],
    [546, 264],
    [580, 262],
  ].map(([x, y]) => {
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", class: "t-mono" }, headG);
    t.textContent = "+";
    return { t, x, y };
  });
  const headName = el("text", { x: 410, "text-anchor": "middle", class: "lbl" }, headG);
  headName.textContent = "Myosin head";
  const bend = el("path", { class: "l-flow w3 dash", id: `${P}-bend` }, headG);
  // the loops at the pocket's mouth: hinge points, and their open/closed angles
  const loopsG = el("g", { id: `${P}-loops` }, headG);
  const loops = [
    { hinge: [518, 352], open: 100, shut: -12 },
    { hinge: [602, 336], open: 70, shut: 168 },
  ].map((L) => ({ ...L, path: el("path", { class: "l-subject w3", d: "M0 0q14 10 30 4" }, loopsG) }));

  // ATP: the compact mark, scaled up; a minus on each bead; Mg2+ beside
  const nucG = el("g", { id: `${P}-atp` }, svg);
  const nuc = atpCompact(nucG, 0, 0, 3);
  // charges and Mg2+ stay upright: placed from the mark's own points
  const nucMarks = el("g", {}, svg);
  const signs = [0, 1, 2].map(() => {
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", class: "t-mono" }, nucMarks);
    t.textContent = "−";
    return t;
  });
  const mgDot = el("circle", { r: 9, class: "f-muted l-muted w25" }, nucMarks);
  const mgT = el("text", { class: "t-small" }, nucMarks);
  mgT.textContent = "Mg²⁺";

  // labels
  const lbl = (txt, x, y, anchor = "start", cls = "lbl") => {
    const t = el("text", { x, y, "text-anchor": anchor, class: cls }, svg);
    t.textContent = txt;
    return t;
  };
  const lActin = lbl("Actin", 270, 26);
  const cleft = el("text", { x: 630, y: 128, class: "lbl" }, svg);
  const c1 = el("tspan", { x: 630 }, cleft);
  c1.textContent = "Cleft:";
  const c2 = el("tspan", { x: 630, dy: "1.2em" }, cleft);
  lbl("Pocket", 640, 300);
  lbl("Loops", 640, 400);
  lbl("Schematic, not to scale", 262, 432, "start", "t-small t-muted");
  const lead = [0, 1, 2].map(() => el("path", { class: "l-ink w2" }, leaders));

  // state: the last action, and when it began
  const st = { loaded: false, at: -99, flashed: true };

  function draw(t) {
    const dt = t - st.at;
    let atpIn; // 0 outside, 1 in the pocket
    let shut; // loops: 0 open, 1 closed
    let reach; // the bend's progress up the head
    let open; // cleft: 0 gripping, 1 open
    let leave = 0; // the pieces leaving
    if (st.loaded) {
      atpIn = ease(dt, 0, 0.9);
      shut = ease(dt, 0.9, 1.3);
      reach = ease(dt, 1.3, 2.1);
      open = ease(dt, 2.1, 2.9);
      if (!st.flashed && dt >= 0.95) {
        st.flashed = true;
        figure.flash(loopsG, { byReader: true });
      }
    } else {
      const fresh = st.at < -50;
      leave = fresh ? 1 : ease(dt, 0, 0.9);
      atpIn = fresh ? 0 : 1;
      shut = fresh ? 0 : 1 - ease(dt, 0.6, 1.1);
      reach = fresh ? 0 : dt < 0.6 ? 1 : 0;
      open = fresh ? 0 : 1 - ease(dt, 1.0, 1.9);
    }
    const T = TOP + DROP * open;
    const hw = lerp(4, 30, open);
    head.setAttribute("d", headPath(T, hw));
    for (const p of pluses) {
      p.t.setAttribute("x", p.x);
      p.t.setAttribute("y", (p.y + T - TOP).toFixed(1));
    }
    headName.setAttribute("y", (T + 150).toFixed(1));
    // the loops swing about their hinges
    for (const L of loops) {
      const a = lerp(L.open, L.shut, shut);
      L.path.setAttribute("transform", `translate(${L.hinge[0]} ${(L.hinge[1] + T - TOP).toFixed(1)}) rotate(${a.toFixed(1)})`);
    }
    // the bend: from the pocket's roof up to the cleft's floor, drawn as it travels
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      if (u > reach) break;
      const x = lerp(556, CX, u) + Math.sin(u * Math.PI) * -38;
      const y = lerp(T + 176, T + 100, u);
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    bend.setAttribute("d", pts.length > 1 ? `M${pts.join("L")}` : "");
    // ATP: from below right into the pocket, tail first
    const inX = 582;
    const inY = T + 272;
    const fromX = 820;
    const fromY = 470;
    const x = lerp(fromX, inX, atpIn);
    const y = lerp(fromY, inY, atpIn);
    nucG.style.display = st.at < -50 || (!st.loaded && leave >= 1) ? "none" : "";
    nucG.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(-110) scale(1.6)`);
    // leaving: the end bead (phosphate) first, then the rest (ADP)
    const lb = ease(leave, 0, 0.7);
    const la = ease(leave, 0.3, 1);
    const bead3 = [-60 * lb, -70 * lb]; // the phosphate, out and to one side
    const adp = [-110 * la, 25 * la]; // the rest, straight out
    nuc.g.setAttribute("transform", `translate(${adp[0].toFixed(1)} ${adp[1].toFixed(1)})`);
    nuc.beads[2].setAttribute("transform", `translate(${bead3[0].toFixed(1)} ${bead3[1].toFixed(1)})`);
    // upright marks at the beads (local mark coordinates → the page)
    const ang = (-110 * Math.PI) / 180;
    const toPage = (lx, ly) => [x + 1.6 * (lx * Math.cos(ang) - ly * Math.sin(ang)), y + 1.6 * (lx * Math.sin(ang) + ly * Math.cos(ang))];
    nucMarks.style.display = nucG.style.display;
    signs.forEach((sg, i) => {
      const off = i === 2 ? bead3 : [0, 0];
      const [sx, sy] = toPage(18 + i * 17 + adp[0] + off[0], -13 + adp[1] + off[1]);
      sg.setAttribute("x", sx.toFixed(1));
      sg.setAttribute("y", sy.toFixed(1));
    });
    // Mg2+ rides with the last two beads; it leaves with the phosphate
    const [mx, my] = toPage(44 + adp[0] + bead3[0] * 0.5, 14 + adp[1] + bead3[1] * 0.5);
    mgDot.setAttribute("cx", mx.toFixed(1));
    mgDot.setAttribute("cy", my.toFixed(1));
    mgT.setAttribute("x", (mx + 14).toFixed(1));
    mgT.setAttribute("y", (my - 8).toFixed(1));
    if (!st.loaded && dt > 0.05) nuc.beads[2].querySelector("path").style.display = "none";
    else nuc.beads[2].querySelector("path").style.display = "";

    // labels and leaders
    c2.textContent = open > 0.5 ? "open" : "gripping";
    lead[0].setAttribute("d", `M624 ${123}L${CX + hw + 4} ${(T + 14).toFixed(1)}`);
    lead[1].setAttribute("d", `M634 ${294}L${568} ${(T + 214).toFixed(1)}`);
    const rl = loops[1].hinge;
    lead[2].setAttribute("d", `M634 ${394}L${rl[0] + 6} ${(rl[1] + T - TOP + 10).toFixed(1)}`);
    void lActin;
  }

  const figure = new Figure(fig, { draw, moves: false });

  btn.addEventListener("click", () => {
    st.loaded = !st.loaded;
    st.flashed = !st.loaded;
    st.at = figure.t;
    figure.act(st.loaded ? LOAD : EMPTY);
    wLoad.classList.toggle("word-hidden", st.loaded);
    wEmpty.classList.toggle("word-hidden", !st.loaded);
    status.textContent = st.loaded
      ? "ATP is in the pocket: the loops close, the cleft opens, and the head lets go of the actin."
      : "The pocket is empty: the head grips the actin again.";
  });

  const crop = () => {
    const narrow = fig.clientWidth < 640;
    svg.classList.toggle("zoom", narrow);
    svg.setAttribute("viewBox", narrow ? "250 0 480 440" : "0 0 900 440");
    svg.setAttribute("width", narrow ? 480 : 900);
    void clamp;
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
