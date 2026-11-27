// Figure 9.2 · atom-ledger (optional) · 700 × 320 (phone: 354 wide)
// A two-sided ledger for burning 10 kg of body fat, as bars to scale: in,
// 10 kg fat and 29 kg oxygen; out, 28 kg carbon dioxide and 11 kg water.
// Numbers in IBM Plex Mono. (Meerman & Brown 2014, BMJ.) Still.
import { el } from "../assets/js/marks.js";

const ROWS = [
  ["In", [["Fat", 10, "f-subject"], ["Oxygen", 29, "f-muted"]]],
  ["Out", [["Carbon dioxide", 28, "f-subject"], ["Water", 11, "f-muted"]]],
];

export function mount(fig) {
  const svg = fig.querySelector("svg.art");
  const P = fig.id;
  function build() {
    const narrow = fig.clientWidth < 640;
    for (const n of [...svg.children]) n.remove();
    const W = narrow ? 354 : 700;
    const x0 = narrow ? 44 : 80;
    const k = narrow ? 6.1 : 13; // px per kg
    const H = narrow ? 250 : 300;
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const ts = narrow ? "t-small" : "";
    ROWS.forEach(([side, parts], r) => {
      const g = el("g", { id: `${P}-${side.toLowerCase()}` }, svg);
      const y = (narrow ? 70 : 84) + r * (narrow ? 104 : 120);
      el("text", { x: 0, y: y + 26, class: ts }, g).textContent = side;
      let x = x0;
      parts.forEach(([name, kg, face], i) => {
        const w = kg * k;
        el("rect", { x, y, width: w, height: 40, class: `${face} ${face === "f-subject" ? "l-subject" : "l-muted"} w3` }, g);
        // the name above, the number inside (or beside, if the bar is short)
        const above = el("text", { x: x + (i ? w : 0), y: y - 12, "text-anchor": i ? "end" : "start", class: ts }, g);
        above.textContent = name;
        el("text", { x: x + w / 2, y: y + 27, "text-anchor": "middle", class: `t-mono ${ts}` }, g).textContent = `${kg} kg`;
        x += w;
      });
      el("text", { x: x + 12, y: y + 27, class: `t-mono ${ts}` }, g).textContent = "39 kg";
    });
  }
  build();
  new ResizeObserver(build).observe(fig);
}
