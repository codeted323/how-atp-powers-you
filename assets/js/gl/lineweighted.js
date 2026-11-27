// A small WebGL2 renderer for the "Line, weighted" style in 3D.
// Faces are solid washes, shaded only a little toward their line color.
// Lines are drawn by the inverted-hull method: each shape is drawn again,
// back faces only, pushed out along its normals by a fixed number of
// screen pixels, in its line color. So outlines and contours keep their
// 2–4 px weight at every zoom and turn, like the SVG drawings.

const VS_FACE = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uMVP; uniform mat3 uNrm;
out vec3 vN;
void main(){ vN = uNrm * aNor; gl_Position = uMVP * vec4(aPos, 1.0); }`;
const FS_FACE = `#version 300 es
precision mediump float;
in vec3 vN; uniform vec3 uWash; uniform vec3 uLine; out vec4 o;
void main(){
  float l = max(dot(normalize(vN), normalize(vec3(-0.4, 0.7, 0.6))), 0.0);
  o = vec4(mix(uWash, uLine, 0.14 * (1.0 - l)), 1.0);
}`;
const VS_HULL = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uMVP; uniform vec2 uView; uniform float uWidth;
void main(){
  vec4 c = uMVP * vec4(aPos, 1.0);
  vec4 n = uMVP * vec4(aNor, 0.0);
  vec2 d = n.xy * uView;
  float len = length(d);
  d = len > 1e-5 ? d / len : vec2(0.0);
  c.xy += d / uView * uWidth * c.w; // uWidth px out from the edge
  gl_Position = c;
}`;
const FS_HULL = `#version 300 es
precision mediump float; uniform vec3 uLine; out vec4 o;
void main(){ o = vec4(uLine, 1.0); }`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  // both programs share attribute slots, set before linking
  gl.bindAttribLocation(p, 0, "aPos");
  gl.bindAttribLocation(p, 1, "aNor");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

// ---------- matrices (column-major) ----------
export const M = {
  ident: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) {
    const o = new Array(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
        o[i * 4 + j] = s;
      }
    return o;
  },
  persp(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
  },
  trans: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  scale: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  rotY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  rotX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  rotZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  apply(m, [x, y, z]) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
      w,
    ];
  },
  normal(m) {
    // the upper 3 × 3 (our models use rotations and uniform-ish scales)
    return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  },
};

// ---------- meshes ----------
function sphere(seg = 24, rings = 16) {
  const p = [];
  const n = [];
  const idx = [];
  for (let r = 0; r <= rings; r++) {
    const v = (r / rings) * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const u = (s / seg) * 2 * Math.PI;
      const x = Math.sin(v) * Math.cos(u);
      const y = Math.cos(v);
      const z = Math.sin(v) * Math.sin(u);
      p.push(x, y, z);
      n.push(x, y, z);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let s = 0; s < seg; s++) {
      const a = r * (seg + 1) + s;
      const b = a + seg + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  return { p, n, idx };
}
// a capped cylinder along y, radius 1, from y = -1 to 1; the caps are
// rounded a little so the hull outline stays smooth
function cylinder(seg = 28) {
  const p = [];
  const n = [];
  const idx = [];
  const ring = (y, ny, rr) => {
    const start = p.length / 3;
    for (let s = 0; s <= seg; s++) {
      const u = (s / seg) * 2 * Math.PI;
      p.push(Math.cos(u) * rr, y, Math.sin(u) * rr);
      const k = Math.hypot(1, ny) || 1;
      n.push(Math.cos(u) / k, ny / k, Math.sin(u) / k);
    }
    return start;
  };
  const rows = [ring(-1, -1.4, 0.82), ring(-0.96, -0.3, 1), ring(0.96, 0.3, 1), ring(1, 1.4, 0.82)];
  for (let r = 0; r < rows.length - 1; r++)
    for (let s = 0; s < seg; s++) {
      const a = rows[r] + s;
      const b = rows[r + 1] + s;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  for (const [row, y, up] of [[rows[0], -1, -1], [rows[3], 1, 1]]) {
    const c = p.length / 3;
    p.push(0, y, 0);
    n.push(0, up, 0);
    for (let s = 0; s < seg; s++) {
      if (up > 0) idx.push(c, row + s, row + s + 1);
      else idx.push(c, row + s + 1, row + s);
    }
  }
  return { p, n, idx };
}
function box() {
  const p = [];
  const n = [];
  const idx = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  for (const [nn, a, b] of faces) {
    const s = p.length / 3;
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      p.push(nn[0] + a[0] * i + b[0] * j, nn[1] + a[1] * i + b[1] * j, nn[2] + a[2] * i + b[2] * j);
      // box normals point out from the center, so the hull grows evenly
      const q = [nn[0] + a[0] * i + b[0] * j, nn[1] + a[1] * i + b[1] * j, nn[2] + a[2] * i + b[2] * j];
      const l = Math.hypot(...q);
      n.push(q[0] / l, q[1] / l, q[2] / l);
    }
    idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  return { p, n, idx };
}

export function makeRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  const face = compile(gl, VS_FACE, FS_FACE);
  const hull = compile(gl, VS_HULL, FS_HULL);
  const loc = (p, n) => gl.getUniformLocation(p, n);
  const U = {
    f: { mvp: loc(face, "uMVP"), nrm: loc(face, "uNrm"), wash: loc(face, "uWash"), line: loc(face, "uLine") },
    h: { mvp: loc(hull, "uMVP"), view: loc(hull, "uView"), width: loc(hull, "uWidth"), line: loc(hull, "uLine") },
  };
  const upload = (m) => {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const mk = (data, at) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const l = at === "aPos" ? 0 : 1;
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0);
    };
    mk(m.p, "aPos");
    mk(m.n, "aNor");
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: m.idx.length };
  };
  const meshes = { sphere: upload(sphere()), cylinder: upload(cylinder()), box: upload(box()) };

  return {
    gl,
    /**
     * Draws `items` ({mesh, model, wash, line, width}) with the view-projection
     * `vp`; colors are [r, g, b] in 0..1; width in CSS px, times dpr.
     */
    draw(items, vp, paper, dpr) {
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.clearColor(paper[0], paper[1], paper[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      // faces
      gl.useProgram(face);
      gl.cullFace(gl.BACK);
      for (const it of items) {
        const mesh = meshes[it.mesh];
        gl.uniformMatrix4fv(U.f.mvp, false, M.mul(vp, it.model));
        gl.uniformMatrix3fv(U.f.nrm, false, M.normal(it.model));
        gl.uniform3fv(U.f.wash, it.wash);
        gl.uniform3fv(U.f.line, it.line);
        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      }
      // lines: the back faces, pushed out in screen pixels
      gl.useProgram(hull);
      gl.cullFace(gl.FRONT);
      gl.uniform2f(U.h.view, w / 2, h / 2);
      for (const it of items) {
        const mesh = meshes[it.mesh];
        gl.uniformMatrix4fv(U.h.mvp, false, M.mul(vp, it.model));
        gl.uniform1f(U.h.width, it.width * dpr);
        gl.uniform3fv(U.h.line, it.line);
        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      }
      gl.bindVertexArray(null);
    },
  };
}

/** "#rrggbb" → [r, g, b] in 0..1 */
export function rgb(hex) {
  const v = parseInt(hex.trim().slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
