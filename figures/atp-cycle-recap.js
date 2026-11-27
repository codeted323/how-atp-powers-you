// Figure 9.1 · atp-cycle-recap · 980 × 620 (phone: the two halves, stacked)
// The whole system as one loop, reusing simplified forms of Figures 1.1,
// 3.1, 4.1, 5.1, 6.1, 7.1 and 8.1 in the same grammar: breath and food
// enter on the left; food is taken apart; carriers feed the chain in the
// inner wall; protons spin ATP synthase; ATP goes out to three spenders (a
// myosin head, a pump, a builder); ADP and phosphate come back. Play traces
// the chain end to end, stage by stage, with the six captions (the text's
// own six lines); each stage flashes as it is reached by stepping forward.
// 23 s loop. Starts paused: the text says "Press Play".
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle, atpCompact } from "../assets/js/marks.js";

const LOOP = 23;
const S = LOOP / 6;
const CAPTIONS = [
  "You breathe in oxygen and eat food.",
  "Cells take the food apart. Its carbon leaves as CO2, and its electrons load onto carriers.",
  "The carriers drop their electrons into the chain in the mitochondrion's inner wall. Each hop helps pump protons, and oxygen catches the electrons at the end, becoming water.",
  "The protons flow back through ATP synthase, spinning its rotor and making ATP.",
  "ATP is spent on motion, pumping, building and switching, and becomes ADP and phosphate.",
  "The ADP and phosphate return to ATP synthase, and the loop repeats.",
];
const WALL = [120, 160];
const PUMPS = [420, 520, 610];
const SYN = [720, 140]; // the synthase's ring, in the wall
const HEAD = [720, 226];
const LOOP_C = [720, 392];
const LOOP_R = 150;
const SPEND = [45, 90, 135]; // degrees around the loop: myosin, pump, builder
const onLoop = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [LOOP_C[0] + LOOP_R * Math.cos(a), LOOP_C[1] + LOOP_R * Math.sin(a)];
};

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const caption = fig.querySelector(`#${P}-caption`);
  const stepBtn = fig.querySelector(`#${P}-step`);
  for (const c of [...svg.children]) c.remove();
  const defs = el("defs", {}, svg);
  const world = el("g", { id: `${P}-world` }, defs);
  const lab = (x, y, words, anchor = "start") => {
    const t = el("text", { x, y, "text-anchor": anchor, class: "lbl" }, world);
    t.textContent = words;
  };

  // ---- context ----
  el("rect", { x: 340, y: WALL[0], width: 480, height: WALL[1] - WALL[0], class: "f-muted" }, world);
  el("path", { d: `M340 ${WALL[0]}H820M340 ${WALL[1]}H820`, class: "l-muted w3" }, world);
  lab(820, 104, "Inner wall", "end");
  // the loop's guide: ATP out on the right, ADP back on the left
  el("circle", { cx: LOOP_C[0], cy: LOOP_C[1], r: LOOP_R, class: "l-ink w2 o50 dash" }, world);
  // ---- the chain's pumps (subject faces) ----
  const pumps = el("g", { id: `${P}-pumps` }, world);
  for (const x of PUMPS) el("rect", { x: x - 24, y: 102, width: 48, height: 76, rx: 18, class: "f-subject l-subject w3" }, pumps);
  // ---- ATP synthase: ring in the wall, axle, head below (context) ----
  const ring = el("g", { id: `${P}-ring` }, world);
  el("rect", { x: SYN[0] - 40, y: SYN[1] - 26, width: 80, height: 52, rx: 14, class: "f-subject l-subject w3" }, ring);
  const units = [0, 1, 2, 3].map(() => el("path", { class: "l-subject w2" }, ring));
  el("path", { d: `M${SYN[0]} ${SYN[1] + 26}L${HEAD[0] + 6} ${HEAD[1] - 30}`, class: "l-subject w4" }, world);
  const head = el("g", { id: `${P}-head` }, world);
  el("ellipse", { cx: HEAD[0], cy: HEAD[1], rx: 40, ry: 32, class: "f-muted l-muted w3" }, head);
  lab(774, 232, "ATP synthase");
  // ---- spenders (subject) ----
  const spenders = el("g", { id: `${P}-spenders` }, world);
  const [mx, my] = onLoop(SPEND[0]);
  const myo = el("g", {}, spenders);
  el("path", { d: "M0 22V-4", class: "l-subject w3" }, myo);
  const myoHead = el("ellipse", { cx: 0, cy: -16, rx: 16, ry: 12, class: "f-subject l-subject w3" }, myo);
  void myoHead;
  myo.setAttribute("transform", `translate(${mx + 36} ${my + 10})`);
  lab(mx + 36, my + 64, "A muscle motor", "middle");
  const [px, py] = onLoop(SPEND[1]);
  const pumpL = el("rect", { x: -18, y: -22, width: 14, height: 44, rx: 7, class: "f-subject l-subject w3" }, spenders);
  const pumpR = el("rect", { x: 4, y: -22, width: 14, height: 44, rx: 7, class: "f-subject l-subject w3" }, spenders);
  lab(px - 30, py + 36, "A pump", "end");
  const [bx, by] = onLoop(SPEND[2]);
  const bA = el("circle", { r: 9, class: "f-subject l-subject w3" }, spenders);
  const bB = el("circle", { r: 9, class: "f-subject l-subject w3" }, spenders);
  const bBond = el("path", { class: "l-subject w3" }, spenders);
  lab(bx - 40, by + 36, "A builder", "end");

  // ---- the moving things ----
  const movers = el("g", {}, world);
  const o2 = [0, 1].map(() => particle(movers, "o2"));
  const food = el("g", { id: `${P}-food` }, movers);
  const foodBeads = [0, 1, 2, 3, 4, 5].map((i) => {
    el("circle", { cx: i * 22, cy: 0, r: 9, class: "f-subject l-subject w25" }, food);
    return i;
  });
  void foodBeads;
  const co2 = [0, 1, 2].map(() => particle(movers, "co2"));
  const carriers = [0, 1, 2].map(() => {
    const g = el("g", {}, movers);
    el("rect", { x: -22, y: -11, width: 44, height: 22, rx: 10, class: "f-subject l-subject w25" }, g);
    const pair = el("g", {}, g);
    el("circle", { cx: -5, cy: -18, r: 4.5, class: "d-flow" }, pair);
    el("circle", { cx: 5, cy: -18, r: 4.5, class: "d-flow" }, pair);
    return { g, pair };
  });
  const e2 = particle(movers, "e2", { upright: true });
  const protons = Array.from({ length: 6 }, () => particle(movers, "h", { upright: true }));
  const water = particle(movers, "h2o", { upright: true });
  const atps = [0, 1, 2].map(() => atpCompact(movers, 0, 0, 3));
  const lbl = (x, y, w, a) => {
    const t = el("text", { x, y, "text-anchor": a || "start", class: "lbl" }, movers);
    t.textContent = w;
    return t;
  };
  lab(24, 232, "Oxygen");
  lab(24, 352, "Food");
  const co2Label = lbl(150, 60, "CO2 out");
  const waterLabel = lbl(610, 300, "Water", "middle");

  // ---- views: whole, or two halves stacked on a phone ----
  const views = el("g", {}, svg);
  function layout() {
    const narrow = fig.clientWidth < 640;
    for (const c of [...views.children]) c.remove();
    for (const c of [...defs.querySelectorAll("clipPath")]) c.remove();
    for (const t of world.querySelectorAll("text")) t.setAttribute("font-size", narrow ? 24 : 17);
    if (!narrow) {
      svg.setAttribute("viewBox", "0 0 980 620");
      svg.setAttribute("width", 980);
      svg.setAttribute("height", 620);
      el("use", { href: `#${P}-world` }, views);
      return;
    }
    const halves = [[0, 600], [440, 540]];
    svg.setAttribute("viewBox", `0 0 600 ${620 + 560}`);
    svg.setAttribute("width", 600);
    svg.setAttribute("height", 620 + 560);
    halves.forEach(([x0, w], i) => {
      const cp = el("clipPath", { id: `${P}-half-${i + 1}` }, defs);
      el("rect", { x: x0, y: i ? 60 : 0, width: w, height: i ? 560 : 560 }, cp);
      const g = el("g", { transform: `translate(${-x0 + (i ? 30 : 0)} ${i ? 560 : 0})` }, views);
      el("use", { href: `#${P}-world`, "clip-path": `url(#${P}-half-${i + 1})` }, g);
    });
  }

  function draw(t) {
    const u = t % LOOP;
    const k = Math.min(5, Math.floor(u / S));
    const s = u - k * S;
    const ph = (i) => (k > i ? 1 : k < i ? 0 : s / S); // progress of stage i

    // 1: oxygen and food come in from the left
    const in1 = ease(ph(0), 0, 0.9);
    o2.forEach((m, i) => {
      const done = k >= 2 && ease(ph(2), 0.3, 0.9) >= 1;
      // in stage 3 one oxygen goes to the end of the chain
      let x = lerp(-30, 120 + i * 50, in1);
      let y = 260 + i * 12;
      if (i === 0 && k >= 2) {
        const q = ease(ph(2), 0.2, 0.8);
        x = lerp(x, PUMPS[2], q);
        y = lerp(y, 200, q);
      }
      m.place(x, y, null, (in1 > 0 && in1 < 1) || (i === 0 && k === 2));
      m.g.style.display = (i === 0 && done) || u < 0.02 ? "none" : "";
    });
    const fx = lerp(-150, 90, in1) + lerp(0, 90, ease(ph(1), 0, 0.3));
    food.setAttribute("transform", `translate(${fx.toFixed(1)} 380)`);
    // 2: the food is taken apart: its carbon leaves as CO2, carriers load
    const apart = ease(ph(1), 0.3, 0.6);
    food.style.display = (k >= 1 && apart >= 1) || u < 0.02 ? "none" : "";
    co2.forEach((m, i) => {
      const q = ease(ph(1), 0.35 + i * 0.08, 0.95);
      const on = k === 1 && q > 0 && q < 1;
      m.g.style.display = on ? "" : "none";
      if (on) m.place(lerp(230 + i * 30, 120 + i * 40, q), lerp(380, -20, q), null, true);
    });
    co2Label.style.display = k === 1 ? "" : "none";
    carriers.forEach((c, i) => {
      const load = ease(ph(1), 0.55, 0.8);
      const go = ease(ph(2), 0, 0.3) ;
      const on = (k === 1 && load > 0) || (k === 2 && ph(2) < 0.4);
      c.g.style.display = on ? "" : "none";
      c.pair.style.display = k === 2 && ph(2) > 0.28 ? "none" : "";
      const x = lerp(260 + i * 50, PUMPS[0] - 50 + i * 4, go);
      const y = lerp(380, 200 + i * 8, go);
      c.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
    // 3: electrons hop pump to pump; protons rise; oxygen takes them: water
    const hop = ease(ph(2), 0.3, 0.85);
    e2.g.style.display = k === 2 && hop > 0 && hop < 1 ? "" : "none";
    if (k === 2) {
      const seg = Math.min(1.999, hop * 2);
      const j = Math.floor(seg);
      const f = seg - j;
      e2.place(lerp(PUMPS[j], PUMPS[j + 1], f), 196 - Math.sin(f * Math.PI) * 16, 0, true);
    }
    protons.forEach((m, i) => {
      // up through the pumps in stage 3; down through the ring in stage 4
      const pump = PUMPS[i % 3];
      const up = ease(ph(2), 0.3 + (i % 3) * 0.18, 0.55 + (i % 3) * 0.18);
      const down = ease(ph(3), 0.05 + i * 0.07, 0.45 + i * 0.07);
      let x = pump + (i < 3 ? -8 : 8);
      let y = lerp(200, 80 - (i % 2) * 18, up);
      x = lerp(x, SYN[0] + (i % 2 ? -14 : 14), ease(ph(3), 0, 0.1 + i * 0.07));
      y = lerp(y, 180, down);
      const on = (k === 2 && up > 0) || (k === 3 && down < 1);
      m.g.style.display = on ? "" : "none";
      m.place(x, y, k === 2 ? -90 : 90, (up > 0 && up < 1) || (k === 3 && down > 0 && down < 1));
    });
    const w = ease(ph(2), 0.85, 1);
    water.g.style.display = k === 2 && w > 0 ? "" : "none";
    water.place(PUMPS[2] + 10, 210 + w * 50, null, true);
    waterLabel.style.display = k === 2 && w > 0 ? "" : "none";
    // 4: the ring spins while protons pass; ATP comes out of the head
    const spin = k === 3 ? s * 3 : 0;
    units.forEach((p, i) => {
      const x = SYN[0] - 30 + ((i * 20 + spin * 20) % 80);
      p.setAttribute("d", `M${x.toFixed(1)} ${SYN[1] - 22}V${SYN[1] + 22}`);
      p.style.display = x > SYN[0] - 36 && x < SYN[0] + 36 ? "" : "none";
    });
    // 4–6: three ATP leave the head, go round to the spenders (5), and come
    // back round as ADP and phosphate (6)
    atps.forEach((a, i) => {
      const made = ease(ph(3), 0.4 + i * 0.15, 0.6 + i * 0.15);
      const out = ease(ph(4), 0, 0.5);
      const back = ease(ph(5), 0, 0.9);
      let deg = -90;
      let x;
      let y;
      if (k === 3) {
        [x, y] = [HEAD[0], lerp(HEAD[1], LOOP_C[1] - LOOP_R, made)];
      } else if (k === 4) {
        deg = lerp(-90, SPEND[i], out);
        [x, y] = onLoop(deg);
      } else {
        deg = lerp(SPEND[i], 270, back);
        [x, y] = onLoop(deg);
      }
      const on = (k === 3 && made > 0) || k === 4 || (k === 5 && back < 1);
      a.g.style.display = on ? "" : "none";
      a.g.setAttribute("transform", `translate(${(x - 26).toFixed(1)} ${y.toFixed(1)})`);
      // spent at its spender: the end bead comes away (ADP + phosphate)
      const spent = k === 5 || (k === 4 && ph(4) > 0.6);
      a.beads[2].setAttribute("transform", spent ? "translate(8 6)" : "");
      const bond = a.beads[2].querySelector("path");
      if (bond) bond.style.display = spent ? "none" : "";
    });
    // the spenders act when their ATP arrives
    const act = k === 4 ? ease(ph(4), 0.5, 0.7) : k === 5 ? 1 : 0;
    const swing = (k === 4 ? act : k === 5 ? 1 - ease(ph(5), 0, 0.3) : 0) * 30;
    myo.setAttribute("transform", `translate(${mx + 36} ${my + 10}) rotate(${(-20 + swing).toFixed(1)})`);
    const flip = act * 8;
    pumpL.setAttribute("transform", `translate(${px} ${py + 20}) rotate(${(8 - flip * 2).toFixed(1)})`);
    pumpR.setAttribute("transform", `translate(${px} ${py + 20}) rotate(${(-8 + flip * 2).toFixed(1)})`);
    const join = 1 - act * 0.6;
    bA.setAttribute("cx", bx - 40 - 14 * join);
    bA.setAttribute("cy", by + 8);
    bB.setAttribute("cx", bx - 40 + 14 * join);
    bB.setAttribute("cy", by + 8);
    bBond.setAttribute("d", `M${bx - 40 - 14 * join + 9} ${by + 8}H${bx - 40 + 14 * join - 9}`);
    bBond.style.display = act > 0.9 ? "" : "none";

    const cap = t <= 0.001 ? "" : CAPTIONS[k];
    if (caption.textContent !== cap) caption.textContent = cap;
  }

  layout();
  const figure = new Figure(fig, { draw });
  figure.selfPaused = true;
  figure.syncButtons();
  new ResizeObserver(layout).observe(fig);
  const flashOf = [food, food, pumps, ring, spenders, head];
  stepBtn.addEventListener("click", () => {
    figure.selfPaused = true;
    figure.syncButtons();
    const loops = Math.floor(figure.t / LOOP);
    const u = figure.t - loops * LOOP;
    const k = figure.t < 0.001 ? -1 : Math.min(5, Math.floor(u / S));
    const next = k + 1;
    figure.t = loops * LOOP + (next >= 6 ? LOOP : next * S);
    figure.busyUntil = figure.t;
    figure.act(S - 0.03);
    // the stage reached by stepping forward flashes
    figure.flash(flashOf[next % 6], { byReader: true });
  });
}
