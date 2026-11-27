// Figure 3.2 · kinesin-walk · 980 × 300 (phone: cropped, larger labels)
// A microtubule track (context) with tick marks 8 nm apart (ink at 0.5);
// kinesin with two feet and a stalk (subject) towing a round cargo
// (context wash). Hand over hand: the rear foot swings past the front one
// and lands 16 nm ahead (two ticks) while the stalk and cargo advance 8 nm
// (one tick). One ATP per step. 13 s loop: the motor walks in from the left
// edge and out at the right, so the loop has no seam. A counter keeps the
// tally: Steps · ATP used · Distance in nm.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el } from "../assets/js/marks.js";

const LOOP = 13;
const NM = 10; // px per nanometer: a tick every 8 nm = 80 px
const TICK = 8 * NM;
const STEPS = 15; // per loop: 15 × 80 = 1200 px, edge to edge
const PER = LOOP / STEPS; // s per step
const TRACK_Y = 212; // top of the track
const START = -170; // stalk x at the loop's start (off the left edge)

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const counter = fig.querySelector(`#${P}-counter`);
  for (const n of [...svg.children]) n.remove();

  const clip = el("clipPath", { id: `${P}-clip` }, el("defs", {}, svg));
  el("rect", { x: 0, y: 0, width: 980, height: 300 }, clip);

  // the track: a long bar, with a tick every 8 nm
  el("rect", { x: -20, y: TRACK_Y, width: 1020, height: 34, class: "f-muted l-muted w3", id: `${P}-track` }, svg);
  for (let x = 10; x < 980; x += TICK) {
    el("path", { d: `M${x} ${TRACK_Y + 6}V${TRACK_Y + 28}`, class: "l-ink w2 o50" }, svg);
  }
  // the 8 nm dimension, under the track
  const dim = el("g", { id: `${P}-dim` }, svg);
  const dx = 10 + TICK * 4; // inside the phone crop too
  el("path", { d: `M${dx} ${TRACK_Y + 44}V${TRACK_Y + 56}M${dx} ${TRACK_Y + 50}H${dx + TICK}M${dx + TICK} ${TRACK_Y + 44}V${TRACK_Y + 56}`, class: "l-ink w2" }, dim);
  el("text", { x: dx + TICK / 2, y: TRACK_Y + 74, "text-anchor": "middle", class: "t-small lbl" }, dim).textContent = "8 nm";
  const tl = el("g", { id: `${P}-track-label` }, svg);
  el("text", { x: 730, y: TRACK_Y + 74, "text-anchor": "end", class: "t-small lbl" }, tl).textContent = "Microtubule track";

  // the walker: cargo (context) on a stalk, two legs, two feet (subject)
  const walker = el("g", { id: `${P}-walker`, "clip-path": `url(#${P}-clip)` }, svg);
  const stalk = el("path", { class: "l-subject w3" }, walker);
  const cargo = el("g", {}, walker);
  el("circle", { cx: 0, cy: 0, r: 40, class: "f-muted l-muted w3" }, cargo);
  const legs = [0, 1].map(() => el("path", { class: "l-subject w3" }, walker));
  const feet = [0, 1].map((i) => {
    const f = el("g", { id: `${P}-foot-${i + 1}` }, walker);
    el("ellipse", { cx: 0, cy: 0, rx: 26, ry: 13, class: "f-subject l-subject w3" }, f);
    return f;
  });
  const hinge = el("circle", { r: 5, class: "d-subject" }, walker);
  // labels that travel with it
  const kl = el("text", { class: "lbl" }, walker);
  kl.textContent = "Kinesin";
  const cl = el("text", { class: "lbl" }, walker);
  cl.textContent = "Cargo";
  const leaders = el("path", { class: "l-ink w4" }, walker);

  let lastCount = -1;
  function draw(t) {
    const loops = Math.floor(t / LOOP);
    const u = t - loops * LOOP;
    const n = Math.floor(u / PER); // steps done this loop
    const s = (u - n * PER) / PER; // 0..1 within the step
    const swing = ease(s, 0.15, 0.8);
    // the stalk (hinge) advances one tick per step
    const hx = START + (n + swing) * TICK;
    // the feet: one leads, one trails; each step the trailing one swings
    // from hx - 40 to hx + 120 (two ticks); the other stays at hx + 40
    const plant = hx - swing * TICK + TICK / 2; // where the standing foot is
    const back = START + n * TICK - TICK / 2; // trailing foot's start
    const ahead = back + 2 * TICK; // where it lands
    const fx = lerp(back, ahead, swing);
    const lift = Math.sin(swing * Math.PI) * 24;
    const standX = START + n * TICK + TICK / 2;
    const swingFoot = n % 2; // the feet take turns
    const footY = TRACK_Y - 13;
    const pos = [];
    pos[swingFoot] = [fx, footY - lift];
    pos[1 - swingFoot] = [standX, footY];
    void plant;
    feet.forEach((f, i) => f.setAttribute("transform", `translate(${pos[i][0].toFixed(2)} ${pos[i][1].toFixed(2)})`));
    // the swinging foot passes in front of the planted one
    walker.appendChild(feet[swingFoot]);
    walker.appendChild(legs[swingFoot]);
    const hy = TRACK_Y - 74;
    hinge.setAttribute("cx", hx.toFixed(2));
    hinge.setAttribute("cy", hy);
    legs.forEach((g, i) => g.setAttribute("d", `M${hx.toFixed(2)} ${hy}L${pos[i][0].toFixed(2)} ${(pos[i][1] - 12).toFixed(2)}`));
    const cy = hy - 86;
    stalk.setAttribute("d", `M${hx.toFixed(2)} ${hy}L${(hx - 26).toFixed(2)} ${cy + 34}`);
    cargo.setAttribute("transform", `translate(${(hx - 52).toFixed(2)} ${cy})`);
    // labels: to the right of the cargo and of the hinge
    cl.setAttribute("x", (hx + 4).toFixed(2));
    cl.setAttribute("y", cy - 8);
    kl.setAttribute("x", (hx + 64).toFixed(2));
    kl.setAttribute("y", hy + 6);
    leaders.setAttribute("d", `M${(hx + 58).toFixed(2)} ${hy}H${(hx + 16).toFixed(2)}`);

    // the tally: every step completed since the figure began
    const count = loops * STEPS + n + (swing >= 1 ? 1 : 0);
    if (count !== lastCount) {
      lastCount = count;
      counter.textContent = `Steps ${count} · ATP used ${count} · Distance ${count * 8} nm`;
    }
  }

  new Figure(fig, { draw });
  const crop = () => {
    const narrow = fig.clientWidth < 640;
    svg.classList.toggle("zoom", narrow);
    svg.setAttribute("viewBox", narrow ? "240 0 500 300" : "0 0 980 300");
    svg.setAttribute("width", narrow ? 500 : 980);
    svg.setAttribute("height", 300);
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
