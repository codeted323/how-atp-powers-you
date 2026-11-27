// Figure 1.1 · atp-molecule · 900 × 360 (phone: 354 × 330)
// ATP drawn simply: adenine (a double ring) and ribose (a five-sided ring)
// are context; the three phosphate beads are the subject. Spend: a water
// molecule (context) drifts in, the end bead breaks off with a burst and
// drifts away, and the label becomes ADP. Recharge: the bead clicks back.
// Idle: the bead tail sways on an 11 s loop. The end bead flashes once on
// first view.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle, burst } from "../assets/js/marks.js";

const SWAY = 11; // s, the idle loop
const SPEND = 2.4; // s: water in 0–1.0, break at 1.0, drift 1.0–2.2
const RECHARGE = 1.6; // s: drift back 0–1.2, click at 1.2

/** A layout: the molecule at scale k from (x0, y0), and where things go. */
function layout(wide) {
  if (wide) {
    return {
      w: 900, h: 360, k: 1, x0: 150, y0: 190, sway: 4, small: false,
      name: [104, 92],
      loose: [790, 236],
      water: [[770, 340], [555, 246]],
      labels: {
        adenine: { text: [150, 300], leader: [150, 280, 150, 240] },
        ribose: { text: [318, 300], leader: [318, 280, 318, 231] },
        phosphates: { text: [510, 70], leader: [510, 84, 510, 150] },
        loose: { text: [790, 140], leader: [790, 152, 790, 196] },
      },
    };
  }
  return {
    w: 354, h: 330, k: 0.6, x0: 36, y0: 170, sway: 3, small: true,
    name: [12, 64],
    loose: [290, 252],
    water: [[340, 322], [279, 206]],
    labels: {
      adenine: { text: [36, 248], leader: [36, 230, 36, 204] },
      ribose: { text: [137, 248], leader: [137, 230, 137, 199] },
      phosphates: { text: [252, 92], leader: [252, 102, 252, 142] },
      loose: { text: [290, 310], leader: [290, 292, 290, 280] },
    },
  };
}

const ngon = (cx, cy, r, n, start) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

export function mount(fig) {
  const P = fig.id; // "atp-molecule"
  const svg = fig.querySelector("svg.art");
  const status = fig.querySelector(`#${P}-status`);
  const spendBtn = fig.querySelector(`#${P}-spend`);
  const rechargeBtn = fig.querySelector(`#${P}-recharge`);

  const state = { adp: false, spendAt: -99, rechargeAt: -99, until: 0 };
  let L; // the active layout
  let parts; // the drawn elements
  let figure;

  function build() {
    const wide = fig.clientWidth >= 640;
    if (L && L.wide === wide) return;
    L = { ...layout(wide), wide };
    const { k, x0, y0 } = L;
    svg.setAttribute("width", L.w);
    svg.setAttribute("height", L.h);
    svg.setAttribute("viewBox", `0 0 ${L.w} ${L.h}`);
    for (const n of [...svg.children]) if (n.tagName !== "title") n.remove();

    // geometry (at k = 1): hexagon R 40 at x0; fused pentagon; ribose r 32
    // at x0 + 168; beads r 30 at x0 + 270, 360, 450
    const R = 40 * k;
    const hx = R * Math.cos(Math.PI / 6);
    const rp = R / (2 * Math.sin(Math.PI / 5));
    const pc = x0 + hx + rp * Math.cos(Math.PI / 5);
    const ribC = x0 + 168 * k;
    const ribR = 32 * k;
    L.beadR = 30 * k;
    L.beadX = [270, 360, 450].map((d) => x0 + d * k);
    L.ribRight = ribC + ribR * Math.cos(Math.PI / 5);
    L.bondMid = (L.beadX[1] + L.beadX[2]) / 2;

    const g = el("g", { id: `${P}-molecule` }, svg);
    // context: adenine and ribose, still
    el("path", { d: `M${pc + rp} ${y0}H${ribC - ribR}`, class: "l-muted w3" }, g);
    el("polygon", { points: ngon(x0, y0, R, 6, 30), class: "f-muted l-muted w3" }, g);
    el("polygon", { points: ngon(pc, y0, rp, 5, 144), class: "f-muted l-muted w3" }, g);
    el("polygon", { points: ngon(ribC, y0, ribR, 5, 180), class: "f-muted l-muted w3" }, g);

    // subject: the tail of three beads
    const tail = el("g", { id: `${P}-tail` }, g);
    const bonds = [0, 1, 2].map((i) => el("path", { id: `${P}-bond-${i + 1}`, class: "l-subject w3" }, tail));
    const beads = [0, 1, 2].map((i) => {
      const b = el("g", { id: `${P}-bead-${i + 1}` }, tail);
      el("circle", { cx: 0, cy: 0, r: L.beadR, class: "f-subject l-subject w3" }, b);
      return b;
    });

    // the water (context) and the burst
    const water = particle(svg, "h2o", { role: "muted", id: `${P}-water`, upright: true, scale: L.small ? 1 : 1.3 });
    const pop = burst(svg, L.bondMid, y0, { id: `${P}-burst` });
    if (L.small) pop.g.setAttribute("transform", `translate(${L.bondMid} ${y0}) scale(0.7)`);

    // labels: ink, with 4 px ink leaders ending 10 px off the part
    const lab = {};
    const ts = L.small ? "t-small" : "";
    for (const [key, words] of Object.entries({
      adenine: "Adenine",
      ribose: "Ribose (a sugar)",
      phosphates: "Three phosphates",
      loose: "Loose phosphate",
    })) {
      const s = L.labels[key];
      const lg = el("g", { id: `${P}-label-${key}` }, svg);
      const [a, b, c, d] = s.leader;
      el("path", { d: `M${a} ${b}L${c} ${d}`, class: "l-ink w4" }, lg);
      const anchor = L.small && key === "adenine" ? "start" : "middle";
      const tx = L.small && key === "adenine" ? 10 : s.text[0];
      el("text", { x: tx, y: s.text[1], "text-anchor": anchor, class: ts }, lg).textContent = words;
      lab[key] = lg;
    }
    const name = el("text", { id: `${P}-name`, x: L.name[0], y: L.name[1], class: "t-name" }, svg);

    parts = { bonds, beads, water, pop, lab, name };
    if (figure) figure.dirty = true;
  }

  function draw(t) {
    const { y0, sway } = L;
    const { bonds, beads, water, pop, lab, name } = parts;
    const ph = (2 * Math.PI * t) / SWAY;
    const sp = t - state.spendAt; // time since Spend
    const rc = t - state.rechargeAt; // time since Recharge

    // where the end bead is: 0 = on the tail, 1 = loose
    let off;
    if (state.adp) off = ease(sp, 1.0, 2.2);
    else off = 1 - ease(rc, 0, 1.2);
    if (!state.adp && state.rechargeAt < 0) off = 0;
    const broken = state.adp ? sp >= 1.0 : rc < 1.2 && state.rechargeAt >= 0;

    // the sway: a slow wave along the tail
    const ys = [0, 1, 2].map((i) => y0 + sway * Math.sin(ph - i * 0.9));
    const pos = beads.map((_, i) => [L.beadX[i], ys[i]]);
    const [lx, ly] = L.loose;
    const free = [lx, ly + sway * Math.sin(ph * 1.3 + 1)];
    pos[2] = [lerp(pos[2][0], free[0], off), lerp(pos[2][1], free[1], off) - Math.sin(off * Math.PI) * 14];
    beads.forEach((b, i) => b.setAttribute("transform", `translate(${pos[i][0].toFixed(2)} ${pos[i][1].toFixed(2)})`));

    // bonds: ribose to bead 1, bead 1 to 2, bead 2 to 3
    const r = L.beadR;
    const seg = (a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      return `M${(a[0] + (dx / d) * r).toFixed(2)} ${(a[1] + (dy / d) * r).toFixed(2)}L${(b[0] - (dx / d) * r).toFixed(2)} ${(b[1] - (dy / d) * r).toFixed(2)}`;
    };
    bonds[0].setAttribute("d", `M${L.ribRight.toFixed(2)} ${y0}L${(pos[0][0] - r).toFixed(2)} ${pos[0][1].toFixed(2)}`);
    bonds[1].setAttribute("d", seg(pos[0], pos[1]));
    bonds[2].setAttribute("d", seg(pos[1], pos[2]));
    bonds[2].style.display = broken ? "none" : "";

    // the water drifts in during Spend, and is used up at the break
    const wIn = state.adp && sp < 1.0;
    water.g.style.display = wIn ? "" : "none";
    if (wIn) {
      const [[ax, ay], [bx, by]] = L.water;
      const p = ease(sp, 0, 1.0);
      water.place(lerp(ax, bx, p), lerp(ay, by, p), null, true);
    }

    // the burst at the break (one flash's worth of orange)
    pop.set(state.adp && sp >= 1.0 ? (sp - 1.0) / pop.length : null);

    // labels
    const isAdp = state.adp && sp >= 1.0;
    name.textContent = isAdp ? "ADP" : "ATP";
    lab.phosphates.style.display = isAdp || broken ? "none" : "";
    lab.loose.style.display = state.adp && sp >= 2.2 ? "" : "none";
  }

  build();
  figure = new Figure(fig, {
    draw,
    onFirstView() {
      if (!state.adp) figure.flash(parts.beads[2]);
    },
  });
  new ResizeObserver(() => build()).observe(fig);

  function sync() {
    spendBtn.disabled = state.adp;
    rechargeBtn.disabled = !state.adp;
  }
  spendBtn.addEventListener("click", () => {
    if (state.adp || figure.t < state.until) return;
    // the burst is a flash: never at the same time as the bead's flash
    figure.flashes = [];
    for (const b of parts.beads) b.classList.remove("is-flash");
    state.adp = true;
    state.spendAt = figure.act(SPEND);
    state.until = state.spendAt + SPEND;
    status.textContent = "Spent: the end phosphate is off. What is left is ADP, and energy was released.";
    sync();
    rechargeBtn.focus();
  });
  rechargeBtn.addEventListener("click", () => {
    if (!state.adp || figure.t < state.until) return;
    state.adp = false;
    state.rechargeAt = figure.act(RECHARGE);
    state.until = state.rechargeAt + RECHARGE;
    status.textContent = "Recharged: the phosphate is back on. It is ATP again.";
    sync();
    spendBtn.focus();
  });
  sync();
}
