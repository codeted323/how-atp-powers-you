// Figure 4.2 · coupled-buckets · 700 × 460 (drawn in a 420-wide frame that
// is centered on a wide screen and fills a phone)
// A pulley (context). (Drawn in a 460-wide frame.) A light bucket ("Uphill job: link two building
// blocks") sits on the floor; a heavy bucket ("ATP → ADP") hangs from its
// own hook, high up. Both buckets are the subject; the rope is ink. Before
// tying, nothing moves. Tie the rope: the rope's end joins the heavy
// bucket, the hook lets go, the heavy bucket falls and the light one
// rises. It resets after 4 s; Reset puts it back at once.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el } from "../assets/js/marks.js";

const PUL = [250, 70]; // the pulley's center
const PR = 38; // its radius
const LX = PUL[0] - PR; // left rope x
const RX = PUL[0] + PR; // right rope x
const FLOOR = 430;
const LIGHT = { w: 64, h: 54 }; // the light bucket
const HEAVY = { w: 116, h: 84 };
const LIGHT_UP = 170; // how far the light bucket rises
const HEAVY_TOP = 176; // the heavy bucket's handle, hanging
const RUN = 2.1; // s: tie 0–0.7, hook 0.7–0.9, fall 0.9–2.1
const HOLD = 4; // s, then it resets
const BACK = 1.0; // s, the reset

function bucket(parent, w, h, id) {
  const g = el("g", { id }, parent);
  // a bucket: a trapezoid body under a handle arc; (0, 0) is the handle's top
  el("path", { d: `M${-w / 2 + 4} 14 A${w / 2 - 4} 14 0 0 1 ${w / 2 - 4} 14`, class: "l-subject w25" }, g);
  el("path", {
    d: `M${-w / 2} 18 L${w / 2} 18 L${w / 2 - 8} ${18 + h} L${-w / 2 + 8} ${18 + h} Z`,
    class: "f-subject l-subject w3",
  }, g);
  return g;
}

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const status = fig.querySelector(`#${P}-status`);
  const tieBtn = fig.querySelector(`#${P}-tie`);
  const resetBtn = fig.querySelector(`#${P}-reset`);
  for (const n of [...svg.children]) n.remove();

  // context: a beam, the pulley's bracket and wheel, a post with a hook arm
  el("path", { d: `M130 14H440`, class: "l-muted w4", id: `${P}-beam` }, svg);
  el("path", { d: `M${PUL[0]} 14V${PUL[1]}`, class: "l-muted w3" }, svg);
  el("circle", { cx: PUL[0], cy: PUL[1], r: PR, class: "f-muted l-muted w3", id: `${P}-pulley` }, svg);
  el("circle", { cx: PUL[0], cy: PUL[1], r: 5, class: "d-ink" }, svg);
  el("path", { d: `M430 14V${FLOOR}`, class: "l-muted w4", id: `${P}-post` }, svg);
  el("path", { d: `M430 ${HEAVY_TOP - 40}H${RX + 30}`, class: "l-muted w3" }, svg);
  const hook = el("path", { id: `${P}-hook`, class: "l-muted w3" }, svg);
  el("path", { d: `M10 ${FLOOR}H450`, class: "l-muted w3", id: `${P}-floor` }, svg);

  // the rope (ink): left side, over the wheel, right side
  const rope = el("path", { id: `${P}-rope`, class: "l-ink w3" }, svg);

  // the buckets (subject)
  const light = bucket(svg, LIGHT.w, LIGHT.h, `${P}-light`);
  const heavy = bucket(svg, HEAVY.w, HEAVY.h, `${P}-heavy`);
  const hw = el("text", { x: 0, y: 18 + HEAVY.h / 2 + 7, "text-anchor": "middle", class: "lbl" }, heavy);
  hw.textContent = "ATP → ADP";
  // the light bucket's label rides beside it
  const ll = el("g", { id: `${P}-light-label` }, svg);
  const lt = el("text", { x: 0, y: 0, "text-anchor": "end", class: "lbl" }, ll);
  ["Uphill job:", "link two", "building blocks"].forEach((w, i) => {
    el("tspan", { x: 0, dy: i ? "1.25em" : 0 }, lt).textContent = w;
  });
  el("path", { d: "M8 -6H20", class: "l-ink w4" }, ll);

  const state = { tiedAt: null, resetAt: null };

  function pose(t) {
    // p: 0 = start, 1 = fallen. tie: 0..1 the rope end reaching the handle
    let tie = 0;
    let hookOpen = 0;
    let p = 0;
    if (state.tiedAt !== null) {
      const s = t - state.tiedAt;
      tie = ease(s, 0, 0.7);
      hookOpen = ease(s, 0.7, 0.9);
      const f = Math.min(1, Math.max(0, (s - 0.9) / (RUN - 0.9)));
      p = f * f; // falling speeds up
      if (s > RUN + HOLD) {
        const b = ease(s, RUN + HOLD, RUN + HOLD + BACK);
        p *= 1 - b;
        tie *= 1 - ease(s, RUN + HOLD + BACK * 0.6, RUN + HOLD + BACK);
        hookOpen *= 1 - ease(s, RUN + HOLD + BACK * 0.6, RUN + HOLD + BACK);
      }
    }
    return { tie, hookOpen, p };
  }

  function draw(t) {
    const { tie, hookOpen, p } = pose(t);
    const lightTop = FLOOR - LIGHT.h - 18 - p * LIGHT_UP; // handle top
    const heavyTop = HEAVY_TOP + p * (FLOOR - HEAVY.h - 18 - HEAVY_TOP);
    light.setAttribute("transform", `translate(${LX} ${lightTop.toFixed(2)})`);
    heavy.setAttribute("transform", `translate(${RX} ${heavyTop.toFixed(2)})`);
    ll.setAttribute("transform", `translate(${LX - LIGHT.w / 2 - 30} ${(lightTop + 4).toFixed(2)})`);
    // the rope's free end hangs just above the heavy handle until tied
    const endY = lerp(HEAVY_TOP - 26, heavyTop, tie);
    rope.setAttribute(
      "d",
      `M${LX} ${lightTop.toFixed(2)}V${PUL[1]} A${PR} ${PR} 0 0 1 ${RX} ${PUL[1]}V${endY.toFixed(2)}`,
    );
    // the hook: from the arm's end down to the handle; it swings open
    // it holds the handle's right shoulder, so the rope can take its top
    const hx = RX + 30;
    const ang = hookOpen * 70;
    const a = (ang * Math.PI) / 180;
    const x2 = hx + Math.sin(a) * 40;
    const y2 = HEAVY_TOP - 40 + Math.cos(a) * 40;
    const cx = Math.cos(a) * -8;
    const cy = Math.sin(a) * 8 + 8;
    hook.setAttribute("d", `M${hx} ${HEAVY_TOP - 40}L${x2.toFixed(2)} ${y2.toFixed(2)}q0 8 ${cx.toFixed(2)} ${cy.toFixed(2)}`);
  }

  const figure = new Figure(fig, { draw, moves: false });
  tieBtn.addEventListener("click", () => {
    if (state.tiedAt !== null && figure.t - state.tiedAt < RUN + HOLD + BACK) return;
    state.tiedAt = figure.act(RUN + HOLD + BACK);
    status.textContent = "Tied: the heavy bucket falls and hauls the light one up. It resets in a few seconds.";
  });
  resetBtn.addEventListener("click", () => {
    state.tiedAt = null;
    figure.dirty = true;
    status.textContent = "Reset: the buckets are untied.";
  });

  // the frame: 420 wide, centered on a 700-wide figure
  const frame = () => {
    const narrow = fig.clientWidth < 640;
    svg.setAttribute("viewBox", narrow ? "0 0 460 460" : "-120 0 700 460");
    svg.setAttribute("width", narrow ? 460 : 700);
    svg.classList.toggle("zoom-s", narrow);
  };
  frame();
  new ResizeObserver(frame).observe(fig);
}
