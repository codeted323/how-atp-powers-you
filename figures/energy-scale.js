// Figure 3.4 · energy-scale · 900 × 340 (phone: 440 × 340, a shorter scale)
// Three bars on one scale of energy per molecule, in pN·nm: one heat kick
// (kT at body temperature, about 4.3; context), kinesin's hardest step
// (about 7 pN × 8 nm = 56; context) and one ATP spent in a cell (80–110;
// subject, the range dashed). Stack lays heat-kick blocks end to end, one
// every 0.3 s, until they pass 110; the blocks inside the ATP range are
// marked in orange. Reset clears them.
import { Figure, clamp } from "../assets/js/figure.js";
import { el } from "../assets/js/marks.js";

const KICK = 4.28; // kT at 37 °C, pN·nm
const STEP = 0.3; // s per block
const COUNT = 26; // 26 × 4.28 = 111, just past 110
const LO = 80;
const HI = 110;

const LAYOUTS = {
  wide: { w: 900, x0: 60, k: 6 },
  narrow: { w: 440, x0: 22, k: 3.5 },
};

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const counter = fig.querySelector(`#${P}-counter`);
  const status = fig.querySelector(`#${P}-status`);
  const stackBtn = fig.querySelector(`#${P}-stack`);
  const resetBtn = fig.querySelector(`#${P}-reset`);
  let L;
  let blocks = [];
  const st = { at: null };

  function label(x, y, name, value) {
    const t = el("text", { x, y, class: "lbl" }, svg);
    const a = el("tspan", {}, t);
    a.textContent = `${name} · `;
    const b = el("tspan", { class: "t-mono" }, t);
    b.textContent = value;
    return t;
  }

  function build() {
    for (const n of [...svg.children]) n.remove();
    svg.setAttribute("viewBox", `0 0 ${L.w} 340`);
    svg.setAttribute("width", L.w);
    svg.classList.toggle("zoom-s", L === LAYOUTS.narrow);
    const { x0, k } = L;
    label(x0, 40, "One heat kick", "about 4");
    el("rect", { x: x0, y: 50, width: KICK * k, height: 22, class: "f-muted l-muted w25", id: `${P}-kick` }, svg);
    label(x0, 110, "Kinesin's hardest step", "up to 56");
    el("rect", { x: x0, y: 120, width: 56 * k, height: 22, class: "f-muted l-muted w25", id: `${P}-kinesin` }, svg);
    label(x0, 180, "One ATP spent in a cell", "80–110");
    el("rect", { x: x0, y: 190, width: LO * k, height: 22, class: "f-subject l-subject w25", id: `${P}-atp` }, svg);
    el("rect", { x: x0 + LO * k, y: 190, width: (HI - LO) * k, height: 22, class: "l-subject w25 dash", id: `${P}-range` }, svg);
    // the stack's row, under the ATP bar
    const row = el("g", { id: `${P}-kicks` }, svg);
    blocks = Array.from({ length: COUNT }, (_, i) => {
      const end = (i + 1) * KICK;
      const inRange = end >= LO && end <= HI;
      return el("rect", {
        x: (x0 + i * KICK * k).toFixed(2),
        y: 226,
        width: (KICK * k).toFixed(2),
        height: 22,
        class: `${inRange ? "f-second l-second" : "f-muted l-muted"} w2`,
      }, row);
    });
    // a faint guide down from the ATP range, so the stack can be read against it
    for (const v of [LO, HI]) {
      el("path", { d: `M${x0 + v * k} 216V256`, class: "l-ink w2 o50" }, svg);
    }
    el("text", { x: x0, y: 290, class: "t-small t-muted" }, svg).textContent = "Heat kicks, laid end to end";
    el("text", { x: x0, y: 326, class: "t-small t-muted" }, svg).textContent = "1 pN·nm = 10⁻²¹ joules";
  }

  let shown = -1;
  function draw(t) {
    const n = st.at === null ? 0 : clamp(Math.floor((t - st.at) / STEP) + 1, 0, COUNT);
    if (n === shown) return;
    shown = n;
    blocks.forEach((b, i) => (b.style.display = i < n ? "" : "none"));
    counter.textContent = `Kicks ${n} · ${Math.round(n * KICK)} pN·nm`;
    if (n === COUNT) {
      status.textContent = `${COUNT} heat kicks reach ${Math.round(COUNT * KICK)} pN·nm, just past one ATP. Kicks 19 to 25 fall inside one ATP's range of 80 to 110.`;
    }
  }

  const figure = new Figure(fig, { draw, moves: false });

  stackBtn.addEventListener("click", () => {
    st.at = figure.t;
    shown = -1;
    status.textContent = "";
    figure.act(COUNT * STEP);
  });
  resetBtn.addEventListener("click", () => {
    st.at = null;
    shown = -1;
    status.textContent = "";
    figure.dirty = true;
  });

  const layout = () => {
    const next = fig.clientWidth < 640 ? LAYOUTS.narrow : LAYOUTS.wide;
    if (next === L) return;
    L = next;
    build();
    shown = -1;
    figure.dirty = true;
  };
  layout();
  new ResizeObserver(layout).observe(fig);
}
