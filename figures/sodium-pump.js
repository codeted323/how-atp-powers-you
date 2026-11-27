// Figure 4.1 · sodium-pump · 900 × 420 (phone: cropped, larger labels)
// The membrane is a horizontal band (context), Outside above and Inside
// below. The pump (subject) spans it: two walls whose pocket opens to one
// side at a time. Sodium (open circles) and potassium (solid squares) are
// flow marks, told apart by shape. The phosphate handed to the pump is
// marked in the look-here orange while it is attached. 12 s loop, started
// by Play: three sodium enter from inside; an ATP docks and its end
// phosphate moves onto the pump; the ADP leaves; the pump flips open to
// the outside and the sodium leaves; two potassium enter; the phosphate
// drops off; the pump flips back and releases the potassium inside.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, particle, atpCompact } from "../assets/js/marks.js";

const LOOP = 12;
const C = [450, 215]; // the pump's center
const MEM = [175, 255]; // the membrane's top and bottom
const TILT = 10; // degrees
const WALL = { w: 54, h: 176, dx: 44 };

const rot = (cx, cy, x, y, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const status = fig.querySelector(`#${P}-status`);
  for (const n of [...svg.children]) n.remove();
  const clip = el("clipPath", { id: `${P}-clip` }, el("defs", {}, svg));
  el("rect", { x: 0, y: 0, width: 900, height: 420 }, clip);

  // the membrane
  el("rect", { x: 0, y: MEM[0], width: 900, height: MEM[1] - MEM[0], class: "f-muted", id: `${P}-membrane` }, svg);
  el("path", { d: `M0 ${MEM[0]}H900M0 ${MEM[1]}H900`, class: "l-muted w3" }, svg);

  // the pump: two walls
  const walls = [-1, 1].map((side, i) => {
    const g = el("g", { id: `${P}-wall-${i + 1}` }, svg);
    el("rect", {
      x: C[0] + side * WALL.dx - WALL.w / 2, y: C[1] - WALL.h / 2, width: WALL.w, height: WALL.h, rx: 24,
      class: "f-subject l-subject w3",
    }, g);
    return { g, cx: C[0] + side * WALL.dx, side };
  });

  // labels
  const ts = "lbl";
  const lab = (x, y, words, anchor = "start") => {
    const t = el("text", { x, y, "text-anchor": anchor, class: ts }, svg);
    t.textContent = words;
    return t;
  };
  lab(700, 40, "Outside the cell", "end");
  lab(240, 404, "Inside");
  // the pump's label and its leader
  lab(600, 118, "Pump");
  el("path", { d: `M590 112H${C[0] + WALL.dx + WALL.w / 2 + 14}`, class: "l-ink w4", id: `${P}-pump-leader` }, svg);
  // a key: the two ions by shape
  const keyNa = particle(svg, "na", { id: `${P}-key-na` });
  keyNa.place(244, 34, 0, false);
  lab(262, 40, "3 sodium out");
  const keyK = particle(svg, "k", { id: `${P}-key-k` });
  keyK.place(244, 70, 0, false);
  lab(262, 76, "2 potassium in");

  // moving things, clipped to the figure
  const movers = el("g", { "clip-path": `url(#${P}-clip)` }, svg);
  const atp = atpCompact(movers, 0, 0, 3, { id: `${P}-atp` });
  const pi = el("g", { id: `${P}-phosphate` }, movers);
  el("circle", { cx: 0, cy: 0, r: 7, class: "f-subject l-subject w25" }, pi);
  const na = [0, 1, 2].map((i) => particle(movers, "na", { id: `${P}-na-${i + 1}`, upright: true }));
  const k = [0, 1].map((i) => particle(movers, "k", { id: `${P}-k-${i + 1}`, upright: true }));
  const naStart = [[300, 450], [450, 460], [600, 450]];
  const naSlot = [[440, 192], [460, 210], [444, 232]];
  const naEnd = [[330, -30], [450, -40], [570, -30]];
  const kStart = [[420, -30], [500, -30]];
  const kSlot = [[444, 200], [456, 230]];
  const kEnd = [[360, 450], [540, 450]];

  let lastNote = "";
  function draw(t) {
    const u = t % LOOP;
    // the pump: 0 = open to the inside, 1 = open to the outside
    const open = ease(u, 5, 6) - ease(u, 9.8, 10.8);
    walls.forEach((w) => {
      const deg = w.side < 0 ? lerp(TILT, -TILT, open) : lerp(-TILT, TILT, open);
      w.g.setAttribute("transform", `rotate(${deg.toFixed(2)} ${w.cx} ${C[1]})`);
      w.deg = deg;
    });
    // the phosphate's site, low on the right wall (it turns with the wall)
    const right = walls[1];
    const site = rot(right.cx, C[1], right.cx + 30, C[1] + 54, right.deg);
    void 0;

    // sodium: in from below (0–2 s), out at the top (6–7.5 s)
    na.forEach((m, i) => {
      const a = ease(u, i * 0.4, i * 0.4 + 1.2);
      const b = ease(u, 6 + i * 0.25, 7 + i * 0.25);
      let x = lerp(naStart[i][0], naSlot[i][0], a);
      let y = lerp(naStart[i][1], naSlot[i][1], a);
      x = lerp(x, naEnd[i][0], b);
      y = lerp(y, naEnd[i][1], b);
      const moving = (a > 0 && a < 1) || (b > 0 && b < 1);
      m.place(x, y, null, moving);
      m.g.style.display = b >= 1 ? "none" : "";
    });
    // potassium: in from the top (7.5–9 s), out below (10.8–12 s)
    k.forEach((m, i) => {
      const a = ease(u, 7.5 + i * 0.3, 8.7 + i * 0.3);
      const b = ease(u, 10.8 + i * 0.2, 11.8 + i * 0.2);
      let x = lerp(kStart[i][0], kSlot[i][0], a);
      let y = lerp(kStart[i][1], kSlot[i][1], a);
      x = lerp(x, kEnd[i][0], b);
      y = lerp(y, kEnd[i][1], b);
      const moving = (a > 0 && a < 1) || (b > 0 && b < 1);
      m.place(x, y, null, moving);
      m.g.style.display = a <= 0 || b >= 1 ? "none" : "";
    });

    // ATP docks (2–3 s), hands over its end phosphate (3–3.9 s), and the
    // ADP leaves (4–5 s). It points its tail at the site.
    const dock = ease(u, 2, 3);
    const leave = ease(u, 4, 5);
    const sugarAt = [site[0] + 66, site[1] + 8];
    const ax = lerp(lerp(760, sugarAt[0], dock), 780, leave);
    const ay = lerp(lerp(450, sugarAt[1], dock), 460, leave);
    atp.g.setAttribute("transform", `translate(${ax.toFixed(2)} ${ay.toFixed(2)}) rotate(180)`);
    atp.g.style.display = u < 2 || leave >= 1 ? "none" : "";
    const handed = u >= 3;
    atp.beads[2].style.display = handed ? "none" : "";

    // the phosphate: from the ATP's tail onto the pump, held (orange), then
    // dropped off inside at 9–9.8 s
    const endBead = [ax - 52, ay];
    const move = ease(u, 3, 3.9);
    const drop = ease(u, 9, 10);
    let px = lerp(endBead[0], site[0], move);
    let py = lerp(endBead[1], site[1], move);
    px = lerp(px, 610, drop);
    py = lerp(py, 440, drop);
    pi.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
    pi.style.display = u >= 3 && drop < 1 ? "" : "none";
    pi.classList.toggle("is-marked", u >= 3.9 && u < 9);

    const note =
      u < 2 ? "Three sodium ions enter the pump from inside." :
      u < 4 ? "An ATP hands the pump its end phosphate." :
      u < 6 ? "The ADP leaves, and the pump flips open to the outside." :
      u < 7.5 ? "The sodium leaves." :
      u < 9 ? "Two potassium ions enter from outside." :
      u < 10.8 ? "The phosphate drops off, and the pump flips back." :
      "The potassium is let go inside.";
    if (note !== lastNote && t > 0) {
      lastNote = note;
      status.textContent = note;
    }
  }

  const figure = new Figure(fig, { draw });
  figure.selfPaused = true; // the text says: Press Play
  figure.syncButtons();
  const crop = () => {
    const narrow = fig.clientWidth < 640;
    svg.classList.toggle("zoom", narrow);
    svg.setAttribute("viewBox", narrow ? "200 0 520 420" : "0 0 900 420");
    svg.setAttribute("width", narrow ? 520 : 900);
  };
  crop();
  new ResizeObserver(crop).observe(fig);
}
