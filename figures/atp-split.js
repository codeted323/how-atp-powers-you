// Figure 2.2 · atp-split · 900 × 380 (phone: cropped, larger labels)
// The end of ATP's tail, atom by atom: the second-to-last phosphate
// (context) and the end phosphate (subject), joined through a shared
// oxygen, with the rest of ATP as a stub. Bond lengths and the bend at the
// shared oxygen are to scale (about 0.15 nm, about 127°); the oxygen that
// points away from the reader is drawn peeking out behind its phosphorus.
// Three stages, 10 s a loop when playing:
//   1 Before: like charges side by side; a water molecule drifts in
//   2 The swap: water's oxygen bonds to the end phosphorus from the far
//     side, the three oxygens flip over like an umbrella, the bond to the
//     shared oxygen breaks, and a hydrogen ion leaves
//   3 After: the pieces push apart and water molecules turn their hydrogen
//     ends toward the charged oxygens
// Step walks one stage; arriving at stage 2 by Step flashes the bond.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, atom, particle } from "../assets/js/marks.js";

const LOOP = 10;
const STAGE = LOOP / 3;
const CAPTIONS = [
  "Before: like charges crowded together",
  "The swap: water's oxygen bonds on, the old bond breaks",
  "After: the pieces push apart, and water wraps them",
];
const R = 16; // an oxygen's radius
const B = 78; // a P–O bond, px (0.15 nm)
const CY = 205;
const PB = [330, CY]; // the second-to-last phosphorus
const OB = [400, CY + 35]; // the shared oxygen
const PG = [470, CY]; // the end phosphorus
const D = [70 / 78, -35 / 78]; // unit: from the shared oxygen through the end P
const N = [-D[1], D[0]]; // in the picture, across D
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const caption = fig.querySelector(`#${P}-caption`);
  const stepBtn = fig.querySelector(`#${P}-step`);
  svg.setAttribute("aria-describedby", `${P}-caption`);
  for (const n of [...svg.children]) n.remove();

  const bonds = el("g", { id: `${P}-bonds` }, svg);
  const atoms = el("g", { id: `${P}-atoms` }, svg);
  const signs = el("g", { id: `${P}-charges` }, svg);
  const labels = el("g", { id: `${P}-labels` }, svg);
  const line = (cls) => el("path", { class: `${cls} w3` }, bonds);
  const seg = (p, a, b) => p.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  const minus = () => {
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", class: "t-mono" }, signs);
    t.textContent = "−";
    return t;
  };
  const putSign = (t, at, from, on = true) => {
    t.style.display = on ? "" : "none";
    const dx = at[0] - from[0];
    const dy = at[1] - from[1];
    const n = Math.hypot(dx, dy) || 1;
    t.setAttribute("x", (at[0] + (dx / n) * (R + 12)).toFixed(1));
    t.setAttribute("y", (at[1] + (dy / n) * (R + 12)).toFixed(1));
  };

  // ---- the ADP side (context): stub, alpha-bridge O, P-beta and its O's
  const stub = line("l-muted");
  const bOa = line("l-muted");
  const bOup1 = line("l-muted");
  const bOup2 = line("l-muted");
  const bBridgeL = line("l-muted");
  const oA = atom(atoms, "O", R);
  const pB = atom(atoms, "P", R);
  const oU1 = atom(atoms, "O", R);
  const oU2 = atom(atoms, "O", R);
  const oBr = atom(atoms, "O", R); // the shared oxygen
  const sB = minus(); // P-beta's charge
  const sBr = minus(); // the shared oxygen's, once it is free
  // ---- the end phosphate (subject)
  const gBack = atom(atoms, "O", R, { role: "subject" }); // points away: peeks out behind P
  const bridgeBond = line("l-subject");
  bridgeBond.setAttribute("id", `${P}-bond`);
  const gBonds = [0, 1].map(() => line("l-subject"));
  const gO = [0, 1].map(() => atom(atoms, "O", R, { role: "subject" }));
  const pG = atom(atoms, "P", R, { role: "subject" });
  const sG = [minus(), minus()];
  // ---- water: O and two H; one H leaves as H+
  const wBond = [line("l-water"), line("l-water")];
  const wO = atom(atoms, "O", R, { role: "water" });
  const wH = [atom(atoms, "H", R, { role: "water" }), atom(atoms, "H", R, { role: "water" })];
  const newBond = line("l-subject");
  const proton = particle(svg, "h", { id: `${P}-proton`, upright: true });
  // ---- waters that wrap the pieces afterward
  const wraps = [0, 1, 2, 3].map(() => {
    const g = el("g", {}, atoms);
    const bl = [el("path", { class: "l-water w25" }, g), el("path", { class: "l-water w25" }, g)];
    const o = atom(g, "O", R, { role: "water" });
    const h = [atom(g, "H", R, { role: "water" }), atom(g, "H", R, { role: "water" })];
    return { g, bl, o, h };
  });

  // labels
  const lbl = (txt, x, y, anchor = "middle") => {
    const t = el("text", { x, y, "text-anchor": anchor, class: "lbl" }, labels);
    t.textContent = txt;
    return t;
  };
  const lRest = lbl("Rest of ATP", 205, 300);
  const lPush = lbl("Push apart", 400, 52);
  const arrow = el("path", { class: "l-ink w2" }, labels);
  const lWater = lbl("Water", 0, 0);
  const lH = lbl("H⁺", 0, 0, "start");
  const lADP = lbl("ADP", 0, 0);
  const lPi = lbl("Loose phosphate", 0, 0);

  function draw(t) {
    const loops = Math.floor(t / LOOP);
    const u = t - loops * LOOP;
    const k = Math.min(2, Math.floor(u / STAGE));
    const s = u - k * STAGE;
    const started = t > 0.001;

    // the swap's progress
    const attach = k === 0 ? 0 : k === 1 ? ease(s, 0, 1.0) : 1; // water O to the P
    const flip = k === 0 ? 0 : k === 1 ? ease(s, 0.5, 1.7) : 1; // umbrella
    const broken = k === 2 || (k === 1 && s > 1.5);
    const hOut = k === 0 ? 0 : k === 1 ? ease(s, 1.5, 3.0) : 1;
    const apart = k === 2 ? ease(s, 0, 1.4) : 0;
    const wrap = k === 2 ? ease(s, 1.0, 2.6) : 0;
    const approach = k === 0 ? (started ? ease(s, 0.3, 3.0) : 0) : 1;

    // the two pieces' offsets
    const left = [-40 * apart, 12 * apart];
    const right = [110 * apart, 0];
    const pb = add(PB, left);
    const ob = add(OB, left);
    const oa = add([260, CY + 35], left);
    const u1 = add([292, CY - 70], left);
    const u2 = add([368, CY - 70], left);
    const pg = add(PG, right);

    // ADP side
    seg(stub, add([182, CY], left), oa);
    seg(bOa, oa, pb);
    seg(bOup1, pb, u1);
    seg(bOup2, pb, u2);
    seg(bBridgeL, pb, ob);
    oA.place(...oa);
    pB.place(...pb);
    oU1.place(...u1);
    oU2.place(...u2);
    oBr.place(...ob);
    putSign(sB, u2, pb);
    putSign(sBr, ob, pb, broken);

    // the end phosphate: the oxygens' lean along D goes from away from the
    // water (+1/3) to toward the old bond (−1/3) as they flip
    const lean = lerp(1 / 3, -1 / 3, flip);
    const lat = 0.943 * B;
    const o1 = add(add(pg, D, lean * B), N, lat);
    const o2 = add(add(pg, D, lean * B), N, -lat);
    const back = add(pg, D, lean * B * 0.9);
    gO[0].place(...o1);
    gO[1].place(...o2);
    gBack.place(...back);
    seg(gBonds[0], pg, o1);
    seg(gBonds[1], pg, o2);
    pG.place(...pg);
    putSign(sG[0], o1, pg);
    putSign(sG[1], o2, pg);
    // the old bond: whole, then dashed as it goes, then gone
    seg(bridgeBond, ob, pg);
    bridgeBond.style.display = broken ? "none" : "";
    bridgeBond.classList.toggle("dash", k === 1 && s > 0.9 && !broken);

    // water: drifts in along D, its oxygen ends one bond from the P
    const start = [820, 92];
    const dock = add(pg, D, B);
    const wait = add(PG, D, 2.3 * B);
    const wo = k === 0 ? [lerp(start[0], wait[0], approach), lerp(start[1], wait[1], approach)] : attach < 1 ? [lerp(wait[0], dock[0], attach), lerp(wait[1], dock[1], attach)] : dock;
    wO.place(...wo);
    const hKeep = add(wo, [0.5, -0.87], 0.65 * B);
    wH[0].place(...hKeep);
    seg(wBond[0], wo, hKeep);
    const hStart = add(wo, [0.97, 0.26], 0.65 * B);
    const hEnd = [700, 70];
    const hp = hOut > 0 ? [lerp(hStart[0], hEnd[0], hOut), lerp(hStart[1], hEnd[1], hOut)] : hStart;
    wH[1].g.style.display = hOut > 0.02 ? "none" : "";
    wH[1].place(...hStart);
    seg(wBond[1], wo, hStart);
    wBond[1].style.display = hOut > 0.02 ? "none" : "";
    proton.g.style.display = hOut > 0.02 ? "" : "none";
    proton.place(hp[0], hp[1], null, hOut > 0.02 && hOut < 1);
    lH.style.display = hOut > 0.3 ? "" : "none";
    lH.setAttribute("x", (hp[0] + 18).toFixed(1));
    lH.setAttribute("y", (hp[1] + 6).toFixed(1));
    // the new bond, once water's oxygen arrives
    seg(newBond, pg, wo);
    newBond.style.display = attach >= 1 ? "" : "none";
    lWater.style.display = k === 0 && started ? "" : "none";
    lWater.setAttribute("x", wo[0].toFixed(1));
    lWater.setAttribute("y", (wo[1] - 72).toFixed(1));

    // push apart: between the crowded charges, then between the pieces
    lPush.style.display = started && (k === 0 || apart > 0.6) ? "" : "none";
    const ax1 = k === 2 ? ob[0] + 30 : u2[0] + 24;
    const ax2 = k === 2 ? back[0] - 26 : o2[0] - 24;
    const ay = k === 2 ? 226 : 70;
    lPush.setAttribute("y", k === 2 ? 210 : 50);
    arrow.style.display = lPush.style.display;
    arrow.setAttribute("d", `M${ax1} ${ay}H${ax2}M${ax1 + 9} ${ay - 7}L${ax1} ${ay}L${ax1 + 9} ${ay + 7}M${ax2 - 9} ${ay - 7}L${ax2} ${ay}L${ax2 - 9} ${ay + 7}`);
    lPush.setAttribute("x", ((ax1 + ax2) / 2).toFixed(1));

    // water wraps the charged oxygens, hydrogen ends first
    // each charged oxygen, and the side its water comes from
    const targets = [
      [u2, [0, -1]],
      [ob, [-0.35, 1]],
      [o2, [0.3, -1]],
      [o1, [1, 0.2]],
    ];
    wraps.forEach((w, i) => {
      w.g.style.display = wrap > 0 ? "" : "none";
      const [at, dir] = targets[i];
      let [dx, dy] = dir;
      const n = Math.hypot(dx, dy);
      dx /= n;
      dy /= n;
      const dist = lerp(3 * B, 1.35 * B, wrap);
      const o = add(at, [dx, dy], dist);
      // the two hydrogens point back toward the charged oxygen, 104° apart
      const base = Math.atan2(-dy, -dx);
      const hs = [base - 0.91, base + 0.91].map((a) => add(o, [Math.cos(a), Math.sin(a)], 0.62 * B));
      w.o.place(...o);
      w.h.forEach((h, j) => h.place(...hs[j]));
      w.bl.forEach((b, j) => seg(b, o, hs[j]));
    });

    lADP.style.display = apart > 0.5 ? "" : "none";
    lADP.setAttribute("x", (pb[0] - 60).toFixed(1));
    lADP.setAttribute("y", 300);
    lPi.style.display = apart > 0.5 ? "" : "none";
    lPi.setAttribute("x", (pg[0] - 10).toFixed(1));
    lPi.setAttribute("y", 366);
    lRest.style.display = apart > 0.5 ? "none" : "";

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
    if (next % 3 === 1) figure.flash(bridgeBond, { byReader: true });
  });

  const crop = () => {
    const narrow = fig.clientWidth < 640;
    svg.classList.toggle("zoom", narrow);
    svg.setAttribute("viewBox", narrow ? "178 0 556 380" : "0 0 900 380");
    svg.setAttribute("width", narrow ? 556 : 900);
    svg.setAttribute("height", 380);
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
