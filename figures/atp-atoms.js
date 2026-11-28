// Figure 2.1 · atp-atoms · 900 × 420 (phone: 440 × 600, the molecule upright)
// Every atom of ATP except the hydrogens, at real relative positions: one
// computed shape of the flexible molecule (RDKit ETKDG + MMFF94, ATP⁴⁻,
// framed so adenine's plane faces the reader at 0°). Adenine and ribose
// are context; the phosphates and their oxygens are subject. The molecule
// turns about its long axis, a full turn every 16 s; the slider sets the
// angle (and stops the turning), Edge on turns the rings edge-on, where
// adenine collapses to one straight line of atoms.
import { Figure, ease, lerp } from "../assets/js/figure.js";
import { el, atom } from "../assets/js/marks.js";

const TURN = 16; // s per full turn
const RATE = 360 / TURN;
// [element, x, y, z (Å), formal charge, part: a adenine, r ribose, t tail]
const ATOMS = [["N",-8.219,-1.969,-1.459,0,"a"],["C",-7.294,-0.923,-1.486,0,"a"],["N",-7.765,0.345,-1.46,0,"a"],["C",-6.861,1.352,-1.472,0,"a"],["N",-5.519,1.276,-1.492,0,"a"],["C",-5.103,-0.001,-1.488,0,"a"],["C",-5.904,-1.132,-1.492,0,"a"],["N",-5.145,-2.283,-1.476,0,"a"],["C",-3.898,-1.852,-1.473,0,"a"],["N",-3.822,-0.48,-1.463,0,"a"],["C",-2.611,0.315,-1.399,0,"r"],["O",-1.6,-0.327,-2.195,0,"r"],["C",-0.319,0.127,-1.667,0,"r"],["C",0.661,-1.042,-1.61,0,"r"],["O",1.844,-0.74,-0.901,0,"t"],["P",2.744,0.536,-1.434,0,"t"],["O",1.958,1.736,-0.914,0,"t"],["O",2.807,0.319,-2.933,-1,"t"],["O",4.059,0.195,-0.608,0,"t"],["P",5.557,0.799,-0.523,0,"t"],["O",5.412,2.283,-0.213,0,"t"],["O",6.269,0.389,-1.804,-1,"t"],["O",6.047,-0.033,0.764,0,"t"],["P",7.381,-0.411,1.592,0,"t"],["O",8.112,-1.513,0.823,0,"t"],["O",8.219,0.85,1.795,-1,"t"],["O",6.851,-0.951,2.933,-1,"t"],["C",-0.585,0.75,-0.287,0,"r"],["O",-0.482,2.186,-0.351,0,"r"],["C",-2.031,0.404,0.007,0,"r"],["O",-2.658,1.401,0.821,0,"r"]];
const BONDS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[15,17],[15,18],[18,19],[19,20],[19,21],[19,22],[22,23],[23,24],[23,25],[23,26],[12,27],[27,28],[27,29],[29,30],[6,1],[29,10],[9,5]];
const PART = { a: "adenine", r: "ribose", t: "tail" };

// wide: the long axis across; phone: the long axis down the page
const LAYOUTS = {
  wide: {
    w: 900, h: 420, S: 44, cx: 450, cy: 222, upright: false,
    labels: {
      adenine: { at: [150, 40], lines: ["Adenine: flat"] },
      ribose: { at: [400, 40], lines: ["Ribose: one bent corner"] },
      tail: { at: [700, 40], lines: ["Phosphates: 3D"] },
    },
    bar: [70, 398],
    note: [830, 398, "end"],
  },
  narrow: {
    w: 440, h: 600, S: 30, cx: 140, cy: 296, upright: true,
    labels: {
      adenine: { at: [300, 70], lines: ["Adenine:", "flat"] },
      ribose: { at: [300, 270], lines: ["Ribose: one", "bent corner"] },
      tail: { at: [300, 470], lines: ["Phosphates:", "3D"] },
    },
    bar: [30, 584],
    note: [420, 584, "end"],
  },
};

export function mount(fig) {
  const P = fig.id;
  const svg = fig.querySelector("svg.art");
  const caption = fig.querySelector(`#${P}-caption`);
  const input = fig.querySelector(`#${P}-turn`);
  const edgeBtn = fig.querySelector(`#${P}-edge`);
  svg.setAttribute("aria-describedby", `${P}-caption`);

  let L;
  let items; // [{kind, el, depth}]
  let leaders;
  let parts;
  let base = 0; // the angle at t = 0 (so angle = base + RATE·t)
  let anim = null; // {from, to, t0, len}

  function build() {
    for (const n of [...svg.children]) n.remove();
    svg.setAttribute("viewBox", `0 0 ${L.w} ${L.h}`);
    svg.setAttribute("width", L.w);
    svg.setAttribute("height", L.h);
    const r = 0.3 * L.S;
    leaders = el("g", { id: `${P}-leaders` }, svg);
    const mol = el("g", { id: `${P}-molecule` }, svg);
    items = [];
    for (const [a, b] of BONDS) {
      const tail = ATOMS[a][5] === "t" && ATOMS[b][5] === "t";
      const path = el("path", { class: `${tail ? "l-subject" : "l-muted"} w3` }, mol);
      items.push({ kind: "bond", a, b, node: path });
    }
    ATOMS.forEach((A, i) => {
      const at = atom(mol, A[0], r, { role: A[5] === "t" ? "subject" : "muted" });
      const it = { kind: "atom", i, node: at.g, mark: at };
      if (A[4] < 0) {
        // the charge: a minus sign just outside the oxygen, away from its phosphorus
        const bonded = BONDS.find(([p, q]) => p === i || q === i);
        it.from = bonded[0] === i ? bonded[1] : bonded[0];
        it.minus = el("text", { "text-anchor": "middle", "dominant-baseline": "central", class: "t-mono" }, mol);
        it.minus.textContent = "−";
      }
      items.push(it);
    });
    parts = {};
    for (const [key, spec] of Object.entries(L.labels)) {
      const t = el("text", { x: spec.at[0], y: spec.at[1], "text-anchor": L.upright ? "start" : "middle", class: "lbl" }, svg);
      spec.lines.forEach((line, k) => {
        const s = el("tspan", { x: spec.at[0], dy: k ? "1.2em" : 0 }, t);
        s.textContent = line;
      });
      const lead = el("path", { class: "l-ink w2" }, leaders);
      parts[key] = { t, lead, spec };
    }
    // the scale bar: 0.5 nm = 5 Å
    const [bx, by] = L.bar;
    const len = 5 * L.S;
    el("path", { d: `M${bx} ${by - 8}V${by}M${bx} ${by - 4}H${bx + len}M${bx + len} ${by - 8}V${by}`, class: "l-ink w2" }, svg);
    el("text", { x: bx + len + 10, y: by, class: "t-small" }, svg).textContent = "0.5 nm";
    const [nx, ny, anchor] = L.note;
    el("text", { x: nx, y: ny, "text-anchor": anchor, class: "t-small t-muted" }, svg).textContent = L.upright ? "No hydrogens" : "Hydrogens not drawn";
  }

  const norm = (a) => ((a % 360) + 360) % 360;

  function angleAt(t) {
    if (anim && t < anim.t0 + anim.len) return lerp(anim.from, anim.to, ease(t, anim.t0, anim.t0 + anim.len));
    return base + RATE * t;
  }

  function project(i, c, s) {
    const [, x, y, z] = ATOMS[i];
    const v = y * c - z * s; // across the long axis, in the picture
    const depth = y * s + z * c; // toward the reader
    if (L.upright) return [L.cx + L.S * v, L.cy + L.S * x, depth];
    return [L.cx + L.S * x, L.cy - L.S * v, depth];
  }

  let lastText = null;
  function draw(t) {
    const ang = norm(angleAt(t));
    const rad = (ang * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const pos = ATOMS.map((_, i) => project(i, c, s));
    for (const it of items) {
      if (it.kind === "atom") {
        const [x, y, d] = pos[it.i];
        it.mark.place(x, y);
        it.depth = d + 0.001;
        if (it.minus) {
          const [fx, fy] = pos[it.from];
          let dx = x - fx;
          let dy = y - fy;
          const n = Math.hypot(dx, dy) || 1;
          // seen end-on the bond is short: push the sign out to one side
          if (n < 0.4 * L.S) {
            dx = 0.7;
            dy = -0.7;
          } else {
            dx /= n;
            dy /= n;
          }
          const k = it.mark.r + 11;
          it.minus.setAttribute("x", (x + dx * k).toFixed(1));
          it.minus.setAttribute("y", (y + dy * k).toFixed(1));
        }
      } else {
        const [x1, y1, d1] = pos[it.a];
        const [x2, y2, d2] = pos[it.b];
        it.node.setAttribute("d", `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
        it.depth = (d1 + d2) / 2 - 0.002; // a bond sits just behind its atoms
      }
    }
    // far things first
    const mol = svg.querySelector(`#${P}-molecule`);
    items.sort((p, q) => p.depth - q.depth);
    for (const it of items) {
      mol.appendChild(it.node);
      if (it.minus) mol.appendChild(it.minus);
    }
    // leaders: from each label to the middle of its part (drawn under the atoms)
    for (const [key, p] of Object.entries(parts)) {
      const idx = ATOMS.map((A, i) => (PART[A[5]] === key ? i : -1)).filter((i) => i >= 0);
      const mx = idx.reduce((a, i) => a + pos[i][0], 0) / idx.length;
      const my = idx.reduce((a, i) => a + pos[i][1], 0) / idx.length;
      const [lx, ly] = p.spec.at;
      const [sx, sy] = L.upright ? [lx - 6, ly - 5] : [lx, ly + 8];
      p.lead.setAttribute("d", `M${sx} ${sy}L${mx.toFixed(1)} ${my.toFixed(1)}`);
    }
    // the slider follows the turn
    const v = Math.round(ang / 3.6) % 100;
    if (document.activeElement !== input && Number(input.value) !== v) input.value = String(v);
    const edge = Math.min(Math.abs(ang - 90), Math.abs(ang - 270)) < 10;
    const face = Math.min(ang, Math.abs(ang - 180), 360 - ang) < 10;
    input.setAttribute("aria-valuetext", `${Math.round(ang)} degrees${edge ? ": edge on" : face ? ": face on" : ""}`);
    const text = edge ? "Edge on: adenine's two rings are one flat sheet." : "";
    if (text !== lastText) {
      caption.textContent = text;
      lastText = text;
    }
  }

  const figure = new Figure(fig, { draw });

  input.addEventListener("input", () => {
    anim = null;
    figure.selfPaused = true;
    figure.syncButtons();
    base = Number(input.value) * 3.6 - RATE * figure.t;
    figure.dirty = true;
  });
  edgeBtn.addEventListener("click", () => {
    const now = norm(angleAt(figure.t));
    // the next edge-on angle ahead (90 or 270), at least a little turn away
    let to = now < 85 ? 90 : now < 265 ? 270 : 450;
    if (Math.abs(to - now) < 2) to = now;
    figure.selfPaused = true;
    figure.syncButtons();
    const len = Math.max(0.3, (Math.abs(to - now) / 180) * 1.6);
    anim = { from: now, to, t0: figure.t, len };
    base = to - RATE * (figure.t + len);
    figure.act(len);
  });

  const layout = () => {
    const next = fig.clientWidth < 640 ? LAYOUTS.narrow : LAYOUTS.wide;
    if (next === L) return;
    L = next;
    build();
    figure.dirty = true;
  };
  layout();
  new ResizeObserver(layout).observe(fig);
}
