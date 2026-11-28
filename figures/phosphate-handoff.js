// Figure 4.3 · phosphate-handoff · 980 × 420 (phone: cropped, larger labels)
// The glutamine hand-off, atom by atom. Glutamate's end group (a carbon
// with two oxygens, one charged; context) on a stub; ATP's end phosphorus
// with its oxygens (subject) joined through a shared oxygen to the rest of
// ATP (context); ammonia, a nitrogen with three hydrogens (context). The
// phosphate is marked in orange while it sits on glutamate.
// Three stages, 14 s a loop when playing:
//   1 glutamate's charged oxygen bonds to ATP's end phosphorus; the shared
//     bond breaks and the rest of ATP leaves as ADP
//   2 ammonia drifts in; its nitrogen bonds to the carbon
//   3 the phosphate leaves, taking that oxygen with it, and one of the
//     nitrogen's hydrogens moves onto it: glutamine
// Step walks one stage; arriving at stage 2 by Step flashes the phosphate.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, atom } from "../assets/js/marks.js";

const LOOP = 14;
const STAGE = LOOP / 3;
const CAPTIONS = [
  "Glutamate's oxygen takes ATP's end phosphate",
  "Ammonia's nitrogen bonds to the carbon",
  "The phosphate leaves with the oxygen: glutamine",
];
const R = 15;
const B = 70;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const caption = fig.querySelector(`#${P}-caption`);
  const stepBtn = fig.querySelector(`#${P}-step`);
  svg.setAttribute("aria-describedby", `${P}-caption`);
  for (const n of [...svg.children]) n.remove();

  const bonds = el("g", {}, svg);
  const atoms = el("g", {}, svg);
  const signs = el("g", {}, svg);
  const labels = el("g", {}, svg);
  const line = (cls) => el("path", { class: `${cls} w3` }, bonds);
  const seg = (p, a, b, on = true) => {
    p.style.display = on ? "" : "none";
    p.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  };
  const minus = () => {
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", class: "t-mono" }, signs);
    t.textContent = "−";
    return t;
  };
  const putSign = (t, at, dir, on = true) => {
    t.style.display = on ? "" : "none";
    t.setAttribute("x", (at[0] + dir[0] * (R + 12)).toFixed(1));
    t.setAttribute("y", (at[1] + dir[1] * (R + 12)).toFixed(1));
  };

  // glutamate's end (context)
  const gStub = line("l-muted");
  const gO1Bond = line("l-muted");
  const gO1Bond2 = line("l-muted"); // the double bond's second line
  const gO2Bond = line("l-muted");
  const gC = atom(atoms, "C", R);
  const gO1 = atom(atoms, "O", R);
  const gO2 = atom(atoms, "O", R);
  const sO2 = minus();
  // the phosphate (subject), and ATP's shared oxygen and stub (context)
  const phos = el("g", { id: `${P}-phosphate` }, atoms);
  const phosBonds = el("g", {}, bonds);
  const back = atom(phos, "O", R, { role: "subject" });
  const pBonds = [0, 1].map(() => el("path", { class: "l-subject w3" }, phosBonds));
  const pO = [0, 1].map(() => atom(phos, "O", R, { role: "subject" }));
  const pP = atom(phos, "P", R, { role: "subject" });
  const sP = [minus(), minus()];
  const linkO2 = line("l-subject"); // glutamate's oxygen to the phosphorus
  const bridge = line("l-subject"); // the phosphorus to ATP's shared oxygen
  const aStub = line("l-muted");
  const aO = atom(atoms, "O", R);
  // ammonia (context)
  const nBonds = [0, 1, 2].map(() => line("l-muted"));
  const nN = atom(atoms, "N", R);
  const nH = [0, 1, 2].map(() => atom(atoms, "H", R));
  const linkN = line("l-muted");

  const lbl = (x, y) => {
    const t = el("text", { x, y, "text-anchor": "middle", class: "lbl" }, labels);
    return t;
  };
  const lGlu = lbl(0, 0);
  const lAtp = lbl(0, 0);
  const lNH3 = lbl(0, 0);
  lNH3.textContent = "Ammonia";
  const lPi = lbl(0, 0);
  lPi.textContent = "Loose phosphate";

  const C0 = [300, 160];
  let narrow = false;
  const P0 = [600, 221];

  function draw(t) {
    const loops = Math.floor(t / LOOP);
    const u = t - loops * LOOP;
    const k = Math.min(2, Math.floor(u / STAGE));
    const s = u - k * STAGE;
    const started = t > 0.001;
    // stage 1
    const reachO = k === 0 ? ease(s, 0.2, 1.8) : 1;
    const bondedO = k > 0 || s > 1.8;
    const flip = k === 0 ? ease(s, 1.8, 2.8) : 1;
    const broken = k > 0 || s > 2.4;
    const adpOut = k === 0 ? ease(s, 2.5, 4.0) : 1;
    // stage 2
    const nIn = k === 0 ? 0 : k === 1 ? ease(s, 0.3, 2.0) : 1;
    const bondedN = k === 2 || (k === 1 && s > 2.0);
    // stage 3
    const piOut = k === 2 ? ease(s, 0.4, 2.2) : 0;
    const hMove = k === 2 ? ease(s, 0.2, 1.2) : 0;
    const leftC = k === 2 && s > 0.3;

    // glutamate's group: slides right until its charged oxygen meets the P
    const c0 = narrow ? [420, C0[1]] : C0;
    const shift = 495 - c0[0];
    const C = add(c0, [shift * reachO, 0]);
    const O1 = add(C, [35, -61]);
    const O2home = add(C, [35, 61]);
    seg(gStub, add(C, [-190, 0]), C);
    seg(gO1Bond, add(C, [-4, -2]), add(O1, [-4, -2]));
    seg(gO1Bond2, add(C, [4, 2]), add(O1, [4, 2]));
    gC.place(...C);
    gO1.place(...O1);

    // the phosphate: in place, then off down and right in stage 3
    const pp = add(P0, [90 * piOut, 110 * piOut]);
    // its three other oxygens lean away from the shared oxygen, then flip
    // to lean away from glutamate's oxygen
    const lean = lerp(-1 / 3, 1 / 3, flip);
    const o1 = add(pp, [lean * B, -0.943 * B]);
    const o2 = add(pp, [lean * B, 0.943 * B]);
    pO[0].place(...o1);
    pO[1].place(...o2);
    back.place(...add(pp, [lean * B * 0.9, 0]));
    pBonds[0].setAttribute("d", `M${pp[0]} ${pp[1]}L${o1[0]} ${o1[1]}`);
    pBonds[1].setAttribute("d", `M${pp[0]} ${pp[1]}L${o2[0]} ${o2[1]}`);
    pP.place(...pp);
    putSign(sP[0], o1, [0.2, -1]);
    putSign(sP[1], o2, [0.2, 1]);
    // glutamate's charged oxygen: on the carbon, then on the phosphorus
    const O2 = k === 2 && leftC ? add(pp, [-B, 0]) : O2home;
    gO2.place(...O2);
    seg(gO2Bond, C, O2, !leftC);
    seg(linkO2, O2, pp, bondedO);
    putSign(sO2, O2, [-0.2, 1], !bondedO);
    // marked orange while it sits on glutamate
    const marked = bondedO && broken && !(k === 2 && s > 0.3);
    phos.classList.toggle("is-marked", marked);
    phosBonds.classList.toggle("is-marked", marked);
    linkO2.classList.toggle("l-second", marked);
    linkO2.classList.toggle("l-subject", !marked);

    // the rest of ATP: the shared oxygen and stub, leaving as ADP
    const ao = add(P0, [B + 60 * adpOut, -30 * adpOut]);
    aO.place(...ao);
    seg(aStub, ao, add(ao, [160, 0]));
    seg(bridge, pp, ao, !broken);
    bridge.classList.toggle("dash", !broken && flip > 0.3);
    lAtp.textContent = broken ? "ADP" : "ATP";
    lAtp.setAttribute("x", (ao[0] + 50).toFixed(1));
    lAtp.setAttribute("y", (ao[1] - 30).toFixed(1));
    lAtp.style.display = adpOut > 0 && adpOut < 0.6 ? "none" : "";

    // ammonia: drifts up to the carbon from below
    const nStart = [420, 360];
    const nEnd = add(C, [-45, 66]);
    const N = mix(nStart, nEnd, nIn);
    nN.place(...N);
    const hs = [add(N, [-40, 22]), add(N, [0, 46]), add(N, [40, 22])];
    // in stage 3 the right-hand hydrogen moves onto glutamate's old oxygen
    if (hMove > 0) hs[2] = mix(hs[2], add(O2, [0, 44]), hMove);
    nH.forEach((h, i) => h.place(...hs[i]));
    nBonds.forEach((b, i) => {
      if (i === 2 && hMove > 0) seg(b, hMove > 0.5 ? O2 : N, hs[2]);
      else seg(b, N, hs[i]);
    });
    seg(linkN, N, C, bondedN);
    lNH3.style.display = !bondedN && started ? "" : "none";
    lNH3.setAttribute("x", (N[0] + 100).toFixed(1));
    lNH3.setAttribute("y", (N[1] + 6).toFixed(1));

    lGlu.textContent = k === 2 && s > 1.2 ? "Glutamine" : "Glutamate";
    lGlu.setAttribute("x", Math.max(C[0] - 110, narrow ? 360 : 0).toFixed(1));
    lGlu.setAttribute("y", (C[1] - 22).toFixed(1));
    lPi.style.display = piOut > 0.5 ? "" : "none";
    lPi.setAttribute("x", (pp[0] - 90).toFixed(1));
    lPi.setAttribute("y", (pp[1] + 72).toFixed(1));

    const text = started ? CAPTIONS[k] : "";
    if (caption.textContent !== text) caption.textContent = text;
  }

  const figure = new Figure(fig, { draw });
  figure.selfPaused = true;
  figure.syncButtons();

  stepBtn.addEventListener("click", () => {
    figure.selfPaused = true;
    figure.syncButtons();
    const loops = Math.floor(figure.t / LOOP);
    const u = figure.t - loops * LOOP;
    const k = Math.min(2, Math.floor(u / STAGE));
    const next = figure.t < 0.001 ? 0 : k + 1;
    figure.t = loops * LOOP + next * STAGE + 0.002;
    figure.busyUntil = figure.t;
    figure.act(STAGE - 0.05);
    if (next % 3 === 1) figure.flash(phos, { byReader: true });
  });

  const crop = () => {
    narrow = fig.clientWidth < 640;
    svg.classList.toggle("zoom", narrow);
    svg.setAttribute("viewBox", narrow ? "300 40 510 380" : "0 0 980 420");
    svg.setAttribute("width", narrow ? 510 : 980);
    svg.setAttribute("height", narrow ? 380 : 420);
    figure.dirty = true;
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
