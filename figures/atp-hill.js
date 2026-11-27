// Figure 2.1 · atp-hill · 900 × 420 (phone: 354 × 380)
// A smooth hill (context, ground wash) with a ball labeled ATP (subject).
// The foot is "ADP + phosphate". A bracket from the foot to the ball shows
// the energy each ATP can give. The slider sets the ATP-to-ADP mix: the
// ball's height grows with the logarithm of how many times over the mix is
// pushed past balance (zero at Balance, about 30 at Lab standard, about 60
// at Living cell: nearly twice as high). The ball wobbles on an 8 s loop.
//
// The math: energy = RT ln(Q/K) per mole, about 5.9 kJ per tenfold push at
// 37 °C. The slider runs 0 to 10.1 tenfold pushes: 0 kJ at Balance, 30.5 at
// Lab standard (5.1 pushes), 60 at Living cell.
import { Figure, ease } from "../assets/js/figure.js";
import { el } from "../assets/js/marks.js";

const WOBBLE = 8; // s
const KJ_PER_DECADE = 5.94; // RT ln 10 at 37 °C, kJ/mol
const DECADES = 10.1; // slider at 100
const LAB = 30.5; // kJ/mol, standard conditions
const CELL = 60;

function layout(wide) {
  if (wide) {
    return { w: 900, h: 420, xb: 20, x0: 190, xf: 560, top: 50, foot: 330, r: 26, px: 4.3, bx: 640, lx: 662, anchor: "start", small: false };
  }
  return { w: 354, h: 370, xb: 0, x0: 36, xf: 150, top: 40, foot: 300, r: 19, px: 3.9, bx: 206, lx: 220, anchor: "start", small: true };
}

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const input = fig.querySelector(`#${P}-mix`);
  let L;
  let parts;
  let figure;
  let value = Number(input.value);

  const energy = (v) => (v / 100) * DECADES * KJ_PER_DECADE;
  const sliderAt = (kj) => (kj / KJ_PER_DECADE / DECADES) * 100;

  // the hill's surface: up from the ground at xb to its top at x0, then a
  // half cosine down to the foot at xf
  const surf = (x) => {
    if (x <= L.xb) return L.foot;
    if (x <= L.x0) {
      const th = (Math.PI * (x - L.xb)) / (L.x0 - L.xb);
      return L.foot - (L.foot - L.top) * (1 - Math.cos(th)) / 2;
    }
    if (x >= L.xf) return L.foot;
    const th = (Math.PI * (x - L.x0)) / (L.xf - L.x0);
    return L.foot - (L.foot - L.top) * (1 + Math.cos(th)) / 2;
  };
  const xAtHeight = (y) => {
    const f = (L.foot - y) / (L.foot - L.top);
    const th = Math.acos(Math.min(1, Math.max(-1, 2 * f - 1)));
    return L.x0 + ((L.xf - L.x0) * th) / Math.PI;
  };

  function build() {
    const wide = fig.clientWidth >= 640;
    if (L && L.wide === wide) return;
    L = { ...layout(wide), wide };
    svg.setAttribute("width", L.w);
    svg.setAttribute("height", L.h);
    svg.setAttribute("viewBox", `0 0 ${L.w} ${L.h}`);
    for (const n of [...svg.children]) n.remove();
    const ts = L.small ? "t-small" : "";

    // the hill: a ground-wash face over the ground line, and its outline
    let d = `M${L.xb} ${L.foot}`;
    for (let x = L.xb; x <= L.xf; x += 3) d += ` L${x} ${surf(x).toFixed(1)}`;
    d += ` L${L.xf} ${L.foot}`;
    el("path", { d: `${d} Z`, class: "f-ground", id: `${P}-ground` }, svg);
    el("path", { d, class: "l-muted w3" }, svg);
    el("path", { d: `M${L.xb} ${L.foot}H${L.w - (L.small ? 0 : 20)}`, class: "l-muted w3" }, svg);

    // the ruler: three marked levels on the bracket's line
    const levels = [
      ["balance", 0, L.small ? ["Balance:", "no energy on offer"] : ["Balance: no energy on offer"]],
      ["lab", LAB, ["Lab standard"]],
      ["cell", CELL, ["Living cell"]],
    ];
    for (const [key, kj, words] of levels) {
      const y = L.foot - kj * L.px;
      const g = el("g", { id: `${P}-level-${key}` }, svg);
      el("path", { d: `M${L.bx - 8} ${y}H${L.bx + 8}`, class: "l-ink w2" }, g);
      const t = el("text", { x: L.lx, y: y + 6, "text-anchor": L.anchor, class: ts }, g);
      // the foot's level: its words sit above the ground line
      if (key === "balance") t.setAttribute("y", L.small ? y - 32 : y - 12);
      words.forEach((w, i) => {
        const span = el("tspan", { x: L.lx, dy: i ? "1.2em" : 0 }, t);
        span.textContent = w;
      });
    }

    // the bracket (ink) and its guide from the ball
    const guide = el("path", { id: `${P}-guide`, class: "l-ink w2 o50 dash" }, svg);
    const bracket = el("path", { id: `${P}-bracket`, class: "l-ink w3" }, svg);
    const bLabel = el("text", { id: `${P}-bracket-label`, class: ts, "text-anchor": "end" }, svg);
    const bWords = L.small ? ["Energy each", "ATP can give"] : ["Energy each ATP can give"];
    bWords.forEach((w, i) => {
      el("tspan", { dy: i ? "1.2em" : 0, class: "bl" }, bLabel).textContent = w;
    });

    // the foot's label, under the ground line
    const fl = el("g", { id: `${P}-foot` }, svg);
    el("path", { d: `M${L.xf} ${L.foot + (L.small ? 30 : 36)}V${L.foot + 12}`, class: "l-ink w4" }, fl);
    el("text", { x: L.xf, y: L.foot + (L.small ? 50 : 60), "text-anchor": "middle", class: ts }, fl).textContent = "ADP + phosphate";

    // the ball: the subject
    const ball = el("g", { id: `${P}-ball` }, svg);
    el("circle", { cx: 0, cy: 0, r: L.r, class: "f-subject l-subject w3" }, ball);
    el("text", { x: 0, y: L.small ? 5 : 6, "text-anchor": "middle", class: L.small ? "t-small" : "" }, ball).textContent = "ATP";

    parts = { guide, bracket, bLabel, ball };
    if (figure) figure.dirty = true;
  }

  let shown = value; // eased toward the slider so the ball rolls
  function draw(t, f) {
    const target = value;
    shown = target; // the slider drives it directly; the reader is the motion
    const kj = energy(shown);
    const lift = kj * L.px; // px above the foot
    const wob = Math.sin((2 * Math.PI * t) / WOBBLE) * (lift > 4 ? 3 : 1.5);
    // the ball's contact point on the slope, a little rocked by the wobble
    let cy = L.foot - lift;
    let cx = lift > 0.5 ? xAtHeight(cy) : L.xf + 18;
    cx += wob;
    cy = surf(cx);
    // its center sits r along the surface normal
    const dydx = (surf(cx + 1) - surf(cx - 1)) / 2;
    const nlen = Math.hypot(dydx, 1);
    const bx = cx + (dydx / nlen) * L.r;
    const by = cy - L.r / nlen;
    parts.ball.setAttribute("transform", `translate(${bx.toFixed(2)} ${by.toFixed(2)})`);

    // the bracket: from the foot level up to the ball's contact level
    const yTop = cy;
    const on = L.foot - yTop > 14;
    const X = L.bx;
    parts.bracket.style.display = on ? "" : "none";
    parts.guide.style.display = on ? "" : "none";
    parts.bLabel.style.display = on && L.foot - yTop > (L.small ? 70 : 40) ? "" : "none";
    if (on) {
      parts.bracket.setAttribute("d", `M${X - 10} ${L.foot}H${X}V${yTop.toFixed(1)}H${X - 10}`);
      parts.guide.setAttribute("d", `M${(bx + L.r + 8).toFixed(1)} ${yTop.toFixed(1)}H${X - 16}`);
      const midY = (L.foot + yTop) / 2;
      parts.bLabel.setAttribute("x", X - 18);
      for (const sp of parts.bLabel.querySelectorAll("tspan")) sp.setAttribute("x", X - 18);
      parts.bLabel.setAttribute("y", (midY + (L.small ? -4 : 6)).toFixed(1));
    }
    void f;
  }

  function describe() {
    const kj = energy(value);
    if (value <= 1) return "Balance: no energy on offer";
    const near = (a) => Math.abs(kj - a) < 2.5;
    if (near(LAB)) return "Lab standard";
    if (value >= 99) return "Living cell";
    return kj < LAB ? "Between Balance and Lab standard" : "Between Lab standard and Living cell";
  }

  build();
  figure = new Figure(fig, { draw });
  new ResizeObserver(() => build()).observe(fig);
  input.setAttribute("list", `${P}-marks`);
  // snap gently to the three marks so a reader can land on them
  const dl = document.createElement("datalist");
  dl.id = `${P}-marks`;
  for (const v of [0, Math.round(sliderAt(LAB)), 100]) {
    const o = document.createElement("option");
    o.value = v;
    dl.appendChild(o);
  }
  fig.appendChild(dl);
  input.addEventListener("input", () => {
    value = Number(input.value);
    input.setAttribute("aria-valuetext", describe());
    figure.dirty = true;
  });
  void ease;
}
