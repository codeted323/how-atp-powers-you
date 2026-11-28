// The shared marks, drawn the same way in every figure (marks/ shows them).
//
// 1. THE FLOW MARK: a particle in transit (oxygen, carbon dioxide,
//    bicarbonate, an electron, a proton, water). Color job: "flow", the
//    palette's --palette-flow (today the subject's navy). It is a line
//    color, never a face: open circles at 2.5 px, 0.85 opacity, so it
//    passes the squint test. An open circle is an oxygen atom; a solid dot
//    is a carbon atom or an electron. While it moves it trails a 2 px tail
//    on the side it came from, so a still frame shows its direction.
//    Bicarbonate (carbon dioxide carried dissolved in the blood) is the
//    same carbon with three oxygens, dashed, at 0.60: told apart by shape,
//    not by fading.
// 2. THE ENERGY BURST: six short 3 px rays in `second`, in two fans (up
//    and down), that spring out from a broken bond in 0.5 s and vanish. It is one flash: never at the
//    same time as a flash or a keyword callout.
// 3. ATP: three phosphate beads (subject) on ribose (a five-sided ring)
//    and adenine (a double ring), both context. The compact form is the
//    sugar and three small beads, for figures where ATP is a passenger.
// 4. THE ATOM: for figures drawn atom by atom. A circle marked with its
//    element's letter (C, N, O, P, H), in its part's job: subject, muted
//    (context) or water (a paper face with a water-colored line). Sizes
//    keep the real order (P > C, N, O > H) without claiming true radii;
//    bonds are lines between centers, drawn under the atoms.

export const NS = "http://www.w3.org/2000/svg";

export function el(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (parent) parent.appendChild(n);
  return n;
}

function circle(parent, x, y, r, cls) {
  return el("circle", { cx: x, cy: y, r, class: cls }, parent);
}

// ---------- 1. the flow mark ----------

/** Local shape of each kind, drawn about (0, 0), heading along +x.
 *  `back` is how far the shape reaches behind its center (where the tail
 *  starts). `tone` is the opacity class. */
const KINDS = {
  o2: {
    back: 17,
    tone: "o85",
    draw(g, line) {
      circle(g, -7.5, 0, 9.5, `${line} w25`);
      circle(g, 7.5, 0, 9.5, `${line} w25`);
    },
  },
  co2: {
    back: 24,
    tone: "o85",
    draw(g, line, dot) {
      circle(g, -15, 0, 8, `${line} w25`);
      circle(g, 15, 0, 8, `${line} w25`);
      circle(g, 0, 0, 7, dot);
    },
  },
  hco3: {
    back: 24,
    tone: "o60",
    draw(g, line, dot) {
      circle(g, -15, 3, 8, `${line} w25 dash`);
      circle(g, 15, 3, 8, `${line} w25 dash`);
      circle(g, 0, -13, 8, `${line} w25 dash`);
      circle(g, 0, 3, 7, dot);
    },
  },
  e: {
    back: 7,
    tone: "",
    draw(g, line, dot) {
      circle(g, 0, 0, 6, dot);
    },
  },
  e2: {
    back: 7,
    tone: "",
    draw(g, line, dot) {
      circle(g, 0, -8, 6, dot);
      circle(g, 0, 8, 6, dot);
    },
  },
  h: {
    back: 11,
    tone: "o70",
    draw(g, line) {
      circle(g, 0, 0, 10, `${line} w25`);
      el("path", { d: "M-5 0H5M0 -5V5", class: `${line} w25` }, g);
    },
  },
  // ions, told apart by shape: sodium an open circle, potassium a solid square
  na: {
    back: 11,
    tone: "o85",
    draw(g, line) {
      circle(g, 0, 0, 9, `${line} w25`);
    },
  },
  k: {
    back: 10,
    tone: "o85",
    draw(g, line, dot) {
      el("rect", { x: -7.5, y: -7.5, width: 15, height: 15, class: dot }, g);
    },
  },
  h2o: {
    back: 12,
    tone: "o85",
    draw(g, line) {
      circle(g, 0, -2, 9, `${line} w25`);
      circle(g, -10, 9, 5, `${line} w2`);
      circle(g, 10, 9, 5, `${line} w2`);
    },
  },
};

/**
 * Makes a moving particle in `parent`.
 * @param {string} kind o2 | co2 | hco3 | e | e2 | h | na | k | h2o
 * @param {object} o  role: "flow" (default) or "muted" for context
 *                    (water that only takes part), id: prefixed id,
 *                    upright: the molecule doesn't turn with its heading,
 *                    scale: size (strokes keep their width)
 * @returns {{g: SVGGElement, place(x, y, heading?, moving?): void}}
 */
export function particle(parent, kind, o = {}) {
  const k = KINDS[kind];
  const role = o.role || "flow";
  const line = `l-${role}`;
  const dot = role === "flow" ? "d-flow" : `d-${role}`;
  const g = el("g", { class: `mark mark-${kind} ${k.tone}` }, parent);
  if (o.id) g.setAttribute("id", o.id);
  const body = el("g", {}, g);
  k.draw(body, line, dot);
  const tail = el(
    "path",
    { d: `M${-k.back - 5} 0H${-k.back - 23}`, class: `${line} w2 mark-tail` },
    g,
  );
  let lastX = null;
  let lastY = null;
  return {
    g,
    body,
    tail,
    /** Places the particle. Without a heading, it faces the way it moved. */
    place(x, y, heading = null, moving = true) {
      let h = heading;
      if (h === null && lastX !== null) {
        const dx = x - lastX;
        const dy = y - lastY;
        if (dx * dx + dy * dy > 0.01) h = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      if (h === null) h = this.heading || 0;
      this.heading = h;
      lastX = x;
      lastY = y;
      // the molecule turns with its heading; the tail always trails it
      const spin = o.upright ? 0 : h;
      body.setAttribute("transform", `rotate(${(spin - h).toFixed(1)})`);
      g.setAttribute(
        "transform",
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${h.toFixed(1)})` +
          (o.scale ? ` scale(${o.scale})` : ""),
      );
      tail.style.display = moving ? "" : "none";
    },
  };
}

// ---------- 2. the energy burst ----------

/** Six rays about (x, y). `set(p)` with p in [0, 1) shows it; else hides. */
export function burst(parent, x, y, o = {}) {
  const g = el("g", { class: "mark mark-burst", transform: `translate(${x} ${y})` }, parent);
  if (o.id) g.setAttribute("id", o.id);
  const rays = [];
  // two fans of three, up and down, so they clear the beads on either side
  for (const deg of [-130, -90, -50, 50, 90, 130]) {
    const a = (deg * Math.PI) / 180;
    rays.push({ a, p: el("path", { class: "l-second w3" }, g) });
  }
  const set = (p) => {
    const on = p !== null && p >= 0 && p < 1;
    g.style.display = on ? "" : "none";
    if (!on) return;
    const e = 1 - (1 - p) * (1 - p);
    const r1 = 20 + 10 * e;
    const r2 = 30 + 16 * e;
    for (const { a, p: path } of rays) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      path.setAttribute(
        "d",
        `M${(r1 * c).toFixed(1)} ${(r1 * s).toFixed(1)}L${(r2 * c).toFixed(1)} ${(r2 * s).toFixed(1)}`,
      );
    }
  };
  set(null);
  return { g, set, length: 0.5 };
}

// ---------- 3. ATP ----------

const pts = (list) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
function ngon(cx, cy, r, n, start) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** The geometry of the full ATP mark, about its own origin (adenine's
 *  hexagon center at 0, 0). Shared by the drawings and the marks page. */
export const ATP = (() => {
  const R = 22; // hexagon radius = its side
  const hex = ngon(0, 0, R, 6, 30);
  const s = R;
  const rp = s / (2 * Math.sin(Math.PI / 5));
  const ap = rp * Math.cos(Math.PI / 5);
  const hx = R * Math.cos(Math.PI / 6);
  // the pentagon shares the hexagon's right edge
  const pentFixed = ngon(hx + ap, 0, rp, 5, 144);
  const ribC = 108;
  const rib = ngon(ribC, 0, 18, 5, 180);
  const ribRight = ribC + 18 * Math.cos(Math.PI / 5);
  const beadR = 16;
  const beads = [ribRight + 30, ribRight + 30 + 44, ribRight + 30 + 88];
  return {
    hex: pts(hex),
    pent: pts(pentFixed),
    rib: pts(rib),
    link1: [hx + ap + rp, 0, ribC - 18, 0],
    link2: [ribRight, 0, beads[0] - beadR, 0],
    beads,
    beadR,
    bondGap: 44 - 2 * beadR,
  };
})();

/** Builds the full ATP mark in `parent` (for the marks page; the
 *  drawings write the same shapes inline). */
export function atpFull(parent, x, y, o = {}) {
  const g = el("g", { transform: `translate(${x} ${y})` }, parent);
  if (o.id) g.setAttribute("id", o.id);
  el("polygon", { points: ATP.hex, class: "f-muted l-muted w3" }, g);
  el("polygon", { points: ATP.pent, class: "f-muted l-muted w3" }, g);
  el("polygon", { points: ATP.rib, class: "f-muted l-muted w3" }, g);
  const [a, b, c, d] = ATP.link1;
  el("path", { d: `M${a} ${b}L${c} ${d}`, class: "l-muted w3" }, g);
  const [e, f, h, i] = ATP.link2;
  el("path", { d: `M${e} ${f}L${h} ${i}`, class: "l-subject w3" }, g);
  const beads = [];
  ATP.beads.forEach((bx, k) => {
    const bg = el("g", { class: "atp-bead" }, g);
    if (k > 0) {
      el("path", { d: `M${bx - 44 + ATP.beadR} 0L${bx - ATP.beadR} 0`, class: "l-subject w3" }, bg);
    }
    el("circle", { cx: bx, cy: 0, r: ATP.beadR, class: "f-subject l-subject w3" }, bg);
    beads.push(bg);
  });
  return { g, beads };
}

/** The compact ATP: a small sugar and `n` small beads (3 = ATP, 2 = ADP),
 *  about the sugar's center. Returns the bead groups. */
export function atpCompact(parent, x, y, n = 3, o = {}) {
  const g = el("g", { class: "atp-compact", transform: `translate(${x} ${y})` }, parent);
  if (o.id) g.setAttribute("id", o.id);
  el("polygon", { points: pts(ngon(0, 0, 9, 5, 180)), class: "f-muted l-muted w25" }, g);
  const beads = [];
  for (let k = 0; k < 3; k++) {
    const bx = 18 + k * 17;
    const bg = el("g", { class: "atp-bead" }, g);
    el("path", { d: `M${bx - 9} 0L${bx - 6} 0`, class: "l-subject w25" }, bg);
    el("circle", { cx: bx, cy: 0, r: 6, class: "f-subject l-subject w25" }, bg);
    if (k >= n) bg.style.display = "none";
    beads.push(bg);
  }
  return { g, beads };
}

// ---------- 4. the atom ----------

const ATOM_SCALE = { P: 1.25, H: 0.62 };

/** An atom about (0, 0); `place(x, y)` moves it. `r` is a C/N/O atom's
 *  radius; o.role: "subject" | "muted" (default) | "water". */
export function atom(parent, sym, r, o = {}) {
  const role = o.role || "muted";
  const face = role === "water" ? "f-paper" : `f-${role}`;
  const g = el("g", { class: `mark mark-atom atom-${sym}` }, parent);
  if (o.id) g.setAttribute("id", o.id);
  const rr = r * (ATOM_SCALE[sym] || 1);
  const c = el("circle", { cx: 0, cy: 0, r: rr.toFixed(2), class: `${face} l-${role} w25` }, g);
  const t = el("text", { x: 0, y: 0, "text-anchor": "middle", "dominant-baseline": "central", class: "t-small atom-letter" }, g);
  t.textContent = sym;
  return {
    g,
    c,
    r: rr,
    place(x, y) {
      g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    },
  };
}
