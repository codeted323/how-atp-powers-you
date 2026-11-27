// Figure 4.3 · atp-budget (optional) · 700 × 300 (phone: labels above bars)
// One horizontal range bar per job, in subject color, with the range in
// IBM Plex Mono: where resting ATP goes, from the oxygen used to make it
// (Rolfe & Brown 1997; mostly rat data). Still: nothing here moves.
import { el } from "../assets/js/marks.js";

const JOBS = [
  ["Building proteins", 25, 30],
  ["Sodium–potassium pump", 19, 28],
  ["Making new glucose", 7, 10],
  ["Calcium pumps", 4, 8],
  ["Muscle myosin", 2, 8],
];
const MAX = 35; // percent at the right of the scale

export function mount(fig) {
  const svg = fig.querySelector("svg.art");
  const P = fig.id;
  function build() {
    const narrow = fig.clientWidth < 640;
    for (const n of [...svg.children]) n.remove();
    const W = narrow ? 354 : 700;
    const x0 = narrow ? 14 : 250; // the scale's 0
    const x1 = narrow ? 262 : 560; // its 35 %
    const row = narrow ? 58 : 44;
    const top = narrow ? 40 : 40;
    const H = top + row * JOBS.length + 50;
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const X = (v) => x0 + ((x1 - x0) * v) / MAX;
    // the scale: ticks every 10 %, fine ink
    const axisY = top + row * JOBS.length + 4;
    const scale = el("g", { id: `${P}-scale` }, svg);
    for (const v of [0, 10, 20, 30]) {
      // gridlines on a wide screen; on a phone the labels cross them, so ticks
      const y0 = narrow ? axisY - 8 : top - 10;
      el("path", { d: `M${X(v)} ${y0}V${axisY}`, class: "l-ink w2 o50" }, scale);
      el("text", { x: X(v), y: axisY + 20, "text-anchor": "middle", class: "t-small t-muted" }, scale).textContent = `${v}%`;
    }
    el("text", { x: x0, y: top - 18, class: "t-small t-muted" }, scale).textContent = "Share of the oxygen used to make ATP, at rest";
    JOBS.forEach(([name, lo, hi], i) => {
      const g = el("g", { id: `${P}-job-${i + 1}` }, svg);
      const yc = top + row * i + (narrow ? 34 : 18);
      if (narrow) {
        el("text", { x: x0, y: yc - 16, class: "t-small" }, g).textContent = name;
      } else {
        el("text", { x: x0 - 16, y: yc + 6, "text-anchor": "end" }, g).textContent = name;
      }
      el("rect", { x: X(lo), y: yc - 9, width: X(hi) - X(lo), height: 18, class: "f-subject l-subject w3" }, g);
      // the range, in its own column at the right
      el("text", { x: W - 4, y: yc + 6, "text-anchor": "end", class: "t-mono t-small" }, g).textContent = `${lo}–${hi}%`;
    });
  }
  build();
  new ResizeObserver(build).observe(fig);
}
