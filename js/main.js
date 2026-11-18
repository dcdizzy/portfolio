/* =========================================================
   Pascal Pampel — Portfolio Onepager
   Vanilla JS. Inhalte in DATA (später CMS).
   ========================================================= */
(() => {
"use strict";

/* =========================================================
   1. DATA  (Platzhalter – später aus CMS)
   ========================================================= */
const CATS = ["Grafik", "Video", "UX", "Werbung", "Ideen"];

const SERVICES = {
  Grafik: {
    desc: "Mit Grafikdesign hat bei mir alles angefangen. Vom reduzierten Logo bis zum ausdrucksstarken Veranstaltungsplakat verbinde ich klassisches Mediengestalter-Handwerk mit experimentellen Texturen, klarer Typografie und durchdachten Markenauftritten.",
    list: ["Plakate", "Flyer", "Logos", "Markenauftritte"]
  },
  Video: {
    desc: "Bewegtbild mit Rhythmus und Haltung. Weil ich selbst Musik mache, finde ich das Timing einer Szene: Schnitt, Motion Design, Color Grading und KI-gestützte Clips für Social Media und Kampagnen.",
    list: ["Schnitt", "Motion Design", "Color Grading", "KI-Video"]
  },
  UX: {
    desc: "Gestaltung, die sich am Menschen und an der Logik der Natur orientiert. Von Interfaces und Webdesign bis zu greifbaren Produktstudien, Prototypen und generativer, node-basierter Animation.",
    list: ["Webdesign", "Interfaces", "Produktstudien", "Prototyping"]
  },
  Werbung: {
    desc: "Kampagnen, Keyvisuals und Social-Media-Strategien aus zehn Jahren Agenturalltag. Werbemittel für Print, Web und Video, vom Ausstellungsplakat bis zur Performance-Ad, konzipiert und umgesetzt aus einer Hand.",
    list: ["Kampagnen", "Keyvisuals", "Social Ads", "Print & Web"]
  },
  Ideen: {
    desc: "Manchmal braucht ein Projekt erst den richtigen Bruch. Ich entwickle Kampagnenmechaniken, Narrative und unerwartete Ansätze, bevor der erste Pixel sitzt, etwa einen spontanen Reparaturstand statt eines weiteren Plakats.",
    list: ["Konzeption", "Storytelling", "Creative Direction", "Pitch-Impulse"]
  }
};

// Projekte kommen aus content/projects.json (CMS). Lokal ohne Server: Kopie in content/projects.js
const PROJECTS = ((window.PP_DATA && window.PP_DATA.projects) || []).map((p) => ({
  slug: p.slug, title: p.title, year: p.year, tags: p.tags || [], img: p.cover, pos: p.coverPosition || "50% 50%", desc: p.short
}));
const IMG = (f) => f;
const ALT = window.PP_INTRO === "alt";                    // alternative Intro-Animation
const DATA = (window.PP_DATA && window.PP_DATA.projects) || [];
const POV = { open: false, idx: -1, gl: null, pal: null, alpha: 0, t: 5 };

/* =========================================================
   2. HELPERS
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
let VW = innerWidth, VH = innerHeight, _pad = null;
// Höhen zwischenspeichern: im Frame-Loop nie offsetHeight lesen (würde nach Schreibzugriffen ein Layout erzwingen)
let HERO_H = 0, NAV_H = 0, SCY = 0;   // SCY: Scrollposition einmal pro Frame gelesen
const PAD = () => (_pad ??= parseFloat(getComputedStyle($(".nav")).paddingLeft) || 80);
const pointer = { x: -9999, y: -9999, inside: false };
addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true; if (e.pointerType === "mouse") pointer.t = performance.now(); }, { passive: true });   // Touch-Scrollen zählt nicht als Interaktion
// Hintergründe bewegen sich langsam → im Ruhezustand reichen 30 Bilder/s. Spart die Hälfte der GPU-Arbeit,
// damit Scrollen und die Kreis-/Karten-Animationen immer flüssige 60 bekommen. Bei Mausbewegung im Hero: volle Rate.
const PACE = { hero: 0, foot: 0, pov: 0 };
const paced = (key, dt, full) => { PACE[key] += dt; if (!full && PACE[key] < 1 / 31) return 0; const d = PACE[key]; PACE[key] = 0; return d; };
document.addEventListener("pointerleave", () => (pointer.inside = false));

/* Feder (unterdämpft = bouncy) */
class Spring {
  constructor(k = 150, c = 12, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; this.init = false; }
  step(target, dt) {
    if (!this.init) { this.x = target; this.init = true; return this.x; }
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += (this.k * (target - this.x) - this.c * this.v) * h; this.x += this.v * h; }
    return this.x;
  }
  rest(target) { return Math.abs(this.x - target) < 0.0015 && Math.abs(this.v) < 0.01; }
}

/* CSS-Spring als linear()-Easing für WAAPI (Fallback: Overshoot-Bezier) */
const SPRING_EASE = (() => {
  const supports = window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)");
  if (!supports) return "cubic-bezier(.3, 1.45, .45, 1)";
  const k = 170, c = 15, pts = []; let x = 0, v = 0; const steps = 60, T = 1.1, h = T / steps / 8;
  for (let i = 0; i <= steps; i++) { pts.push(+x.toFixed(4)); for (let j = 0; j < 8; j++) { v += (k * (1 - x) - c * v) * h; x += v * h; } }
  pts[pts.length - 1] = 1;
  return `linear(${pts.join(",")})`;
})();

// Federkurve als Stützpunkte – für Karten wird das Überschießen pro Karte begrenzt,
// damit sie sich beim Umsortieren nie berühren (max. ~40 % der Lücke)
const SPRING_PTS = (() => {
  const k = 170, c = 15, pts = []; let x = 0, v = 0; const steps = 48, T = 1.1, h = T / steps / 8;
  for (let i = 0; i <= steps; i++) { pts.push(x); for (let j = 0; j < 8; j++) { v += (k * (1 - x) - c * v) * h; x += v * h; } }
  pts[pts.length - 1] = 1;
  let m = 0; const mono = pts.map((p) => (m = Math.min(1, Math.max(m, p))));
  return { pts, mono, over: Math.max(...pts) - 1 };
})();
function springFrames(dist, maxOver, frame) {
  const s = dist > 0 ? Math.min(1, maxOver / (SPRING_PTS.over * dist)) : 1;
  const n = SPRING_PTS.pts.length - 1;
  return SPRING_PTS.pts.map((p, i) => {
    const e = SPRING_PTS.mono[i], q = e + (p - e) * s;
    return Object.assign(frame(q), { offset: i / n });
  });
}

/* =========================================================
   3. WEBGL · Flow-Field-Shader (Nachbau der Unicorn-Szene)
      Noise Fill → Flow Field (Advektion) → Lens → Grain/VHS
      + Fluid-Puffer: der Cursor schiebt die Strömung an
   ========================================================= */
const NOISE = `
vec3 mod289(vec3 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x){ return mod289(((x * 34.) + 1.) * x); }
float snoise(vec2 v){
  const vec4 C = vec4(.211324865405187, .366025403784439, -.577350269189626, .024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  vec3 m = max(.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
  m = m * m; m = m * m;
  vec3 x = 2. * fract(p * C.www) - 1.; vec3 h = abs(x) - .5; vec3 ox = floor(x + .5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - .85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130. * dot(m, g);
}
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
`;

const FRAG_MAIN = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uDisp;
uniform float uHasDisp;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uZoom;
uniform float uRefH;
uniform float uHue;
${NOISE}
vec3 hueShift(vec3 c, float a){ const vec3 k = vec3(.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1. - ca); }

vec2 flow(vec2 p, float t){
  float a = snoise(p * .36 + vec2(t * .055, -t * .04)) + .5 * snoise(p * .8 + vec2(-t * .035, t * .05) + 11.7);
  a *= 3.5;                                   // stärkere Drehung → eingerollte Wirbel wie in der Vorlage
  return vec2(cos(a), sin(a));
}

vec3 palette(float f, float g, float e){
  // Farben kommen als Uniforms: Hero, Footer und jede Projektseite haben eigene Paletten
  vec3 col = mix(uC0, uC1, smoothstep(.34, .68, f) * (.6 + .4 * g));      // große, weiche Grundflächen
  float rim = exp(-pow((f - .66) / .06, 2.));                                 // schmaler warmer Saum an der Falte
  col = mix(col, uC3, rim * smoothstep(.2, .8, g) * .75);
  col = mix(col, uC2, smoothstep(.69, .9, f) * .92);                         // helle Flächen
  col = mix(col, mix(uC2, uC3, .5), e * .4);
  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // Lens distort
  vec2 cc = uv - .5;
  vec2 luv = .5 + cc * (1. - .07 * dot(cc, cc));

  vec2 p = (luv - .5) * uRes / uRefH * uZoom;
  vec2 d = uHasDisp > .5 ? texture2D(uDisp, uv).xy : vec2(0.);
  if (!(d.x == d.x) || !(d.y == d.y)) d = vec2(0.);
  d = clamp(d, -3., 3.);
  p -= d * .55;

  float t = uTime;
  vec2 q = p;
  for (int i = 0; i < 22; i++) { q += flow(q, t) * .072; }

  float f = snoise(q * .62 + vec2(t * .018, -t * .012)) * .5 + .5;
  float g = snoise(q * 1.15 + vec2(5.2, -t * .02)) * .5 + .5;

  // dünne Glanzkanten: wo die Strömung zusammenläuft, kippt f abrupt
  float e = smoothstep(.0, .9, fwidthApprox(f));
  vec3 col = palette(f, g, 0.);

  gl_FragColor = vec4(col, 1.);
}`;

/* fwidth gibt es in WebGL1 nur per Extension – deshalb zwei Varianten */
// Handy: weniger, dafür größere Strömungsschritte (gleiches Bild, ~45 % weniger Rechenlast) und feinere Auflösung
const SMALL = Math.min(innerWidth, innerHeight) < 700;
const FLOW_IT = window.__it || (SMALL ? 12 : 16);
function buildMain(hasDeriv) {
  let src = FRAG_MAIN.replace("for (int i = 0; i < 22; i++) { q += flow(q, t) * .072; }",
    `for (int i = 0; i < ${FLOW_IT}; i++) { q += flow(q, t) * ${(0.072 * 22 / FLOW_IT).toFixed(4)}; }`);
  if (hasDeriv) {
    src = "#extension GL_OES_standard_derivatives : enable\n" + src
      .replace("float e = smoothstep(.0, .9, fwidthApprox(f));\n  vec3 col = palette(f, g, 0.);",
        `float fw = fwidth(f) * uRes.y * .0016;
  float e = smoothstep(.05, .5, fw);
  vec3 col = palette(f, g, e);`);
  } else {
    src = src.replace("float e = smoothstep(.0, .9, fwidthApprox(f));\n  vec3 col = palette(f, g, 0.);", "vec3 col = palette(f, g, 0.);");
  }
  // Post: VHS-Streifen + Grain + leichte Vignette
  src = src.replace("  gl_FragColor = vec4(col, 1.);", `
  col = hueShift(col, uHue);
  col *= 1. - dot(cc, cc) * .35;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);`);
  return src;
}

const FRAG_SIM = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSimRes;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uAspect;
uniform float uDecay;
uniform float uDt;
void main(){
  vec2 uv = gl_FragCoord.xy / uSimRes;
  vec2 v = texture2D(uPrev, uv).xy;
  vec2 back = uv - v * uDt * .35;                 // Selbst-Advektion → zieht Schlieren
  v = texture2D(uPrev, back).xy * uDecay;
  if (!(v.x == v.x) || !(v.y == v.y)) v = vec2(0.);             // NaN abfangen
  v = clamp(v, -3., 3.);                                          // nie aufschaukeln
  vec2 dd = uv - uMouse; dd.x *= uAspect;
  float s = exp(-dot(dd, dd) / .0065);
  v += uVel * s;
  gl_FragColor = vec4(v, 0., 1.);
}`;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

class FlowGL {
  constructor(canvas, { palette = 0, scale = .5, zoom = 2.2, trackEl = null, interactive = true } = {}) {
    this.c = canvas; this.pal = palette; this.scale = scale; this.zoom = zoom; this.track = trackEl || canvas;
    this.ok = false; this.sim = null;
    this.m = { x: .5, y: .5, px: null, py: null, vx: 0, vy: 0 };
    let gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    this.gl2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.ok = false; canvas.style.opacity = "0"; }, false);
    const hasDeriv = !this.gl2 && !!gl.getExtension("OES_standard_derivatives");
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
    const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); return p; };
    // WebGL2 akzeptiert GLSL 100 – Derivate sind dort eingebaut
    this.main = prog(buildMain(hasDeriv));
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.u = this.locs(this.main, ["uRes", "uTime", "uDisp", "uHasDisp", "uC0", "uC1", "uC2", "uC3", "uZoom", "uRefH", "uHue"]);
    if (interactive) this.initSim();
    this.ok = true;
    this.resize();
  }
  locs(p, names) { const o = {}; names.forEach((n) => (o[n] = this.gl.getUniformLocation(p, n))); return o; }
  initSim() {
    const gl = this.gl;
    let type = null, internal = gl.RGBA;
    if (this.gl2) {
      if (gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float")) { type = gl.HALF_FLOAT; internal = gl.RGBA16F; }
    } else {
      const hf = gl.getExtension("OES_texture_half_float");
      gl.getExtension("OES_texture_half_float_linear");
      if (hf && gl.getExtension("EXT_color_buffer_half_float")) { type = hf.HALF_FLOAT_OES; internal = gl.RGBA; }
    }
    if (!type) return;
    const prog = gl.createProgram();
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG_SIM));
    gl.bindAttribLocation(prog, 0, "p"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    const mk = () => {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      return { tex, fb };
    };
    this.sim = { prog, a: mk(), b: mk(), type, internal, w: 0, h: 0, u: this.locs(prog, ["uPrev", "uSimRes", "uMouse", "uVel", "uAspect", "uDecay", "uDt"]) };
  }
  sizeSim(w, h) {
    const gl = this.gl, s = this.sim; if (!s) return;
    const sw = Math.max(16, Math.round(w / 8)), shh = Math.max(16, Math.round(h / 8));
    if (s.w === sw && s.h === shh) return;
    s.w = sw; s.h = shh;
    for (const t of [s.a, s.b]) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, s.internal, sw, shh, 0, gl.RGBA, s.type, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { this.sim = null; break; }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  resize() {
    if (!this.ok) return;
    // kleine Bildschirme: höhere Auflösung, sonst wirkt der Verlauf am Handy pixelig
    const d = this.scale * (SMALL ? 1.9 : 1);   // ohne devicePixelRatio → Grain auf jedem Bildschirm gleich, und deutlich weniger GPU-Last
    const w = Math.max(2, Math.round(this.c.clientWidth * d)), h = Math.max(2, Math.round(this.c.clientHeight * d));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.sizeSim(this.c.clientWidth, this.c.clientHeight);
  }
  updateMouse(dt) {
    const r = this.track.getBoundingClientRect();
    const inside = pointer.inside && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
    const x = (pointer.x - r.left) / r.width, y = 1 - (pointer.y - r.top) / r.height;
    const m = this.m;
    if (!inside || m.px === null) { m.vx = 0; m.vy = 0; m.px = inside ? x : null; m.py = inside ? y : null; m.x = x; m.y = y; return; }
    const k = 1 / Math.max(dt, 1 / 120);
    let vx = (x - m.px) * k * (r.width / r.height), vy = (y - m.py) * k;
    const len = Math.hypot(vx, vy), max = 3.2;
    if (len > max) { vx *= max / len; vy *= max / len; }
    m.vx = vx * .55; m.vy = vy * .55; m.x = x; m.y = y; m.px = x; m.py = y;
  }
  render(time, dt) {
    if (!this.ok) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // Fluid-Puffer
    if (this.sim) {
      this.updateMouse(dt);
      const s = this.sim;
      gl.useProgram(s.prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, s.b.fb);
      gl.viewport(0, 0, s.w, s.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.a.tex);
      gl.uniform1i(s.u.uPrev, 0);
      gl.uniform2f(s.u.uSimRes, s.w, s.h);
      gl.uniform2f(s.u.uMouse, this.m.x, this.m.y);
      gl.uniform2f(s.u.uVel, this.m.vx, this.m.vy);
      gl.uniform1f(s.u.uAspect, s.w / s.h);
      gl.uniform1f(s.u.uDecay, Math.pow(.955, dt * 60));
      gl.uniform1f(s.u.uDt, dt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      [s.a, s.b] = [s.b, s.a];
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.c.width, this.c.height);
    gl.useProgram(this.main);
    const u = this.u;
    gl.uniform2f(u.uRes, this.c.width, this.c.height);
    gl.uniform1f(u.uTime, time);
    const P = this.pal; gl.uniform3fv(u.uC0, P[0]); gl.uniform3fv(u.uC1, P[1]); gl.uniform3fv(u.uC2, P[2]); gl.uniform3fv(u.uC3, P[3]);
    gl.uniform1f(u.uZoom, this.zoom);
    gl.uniform1f(u.uHue, this.hue || 0);
    gl.uniform1f(u.uRefH, this.refH ? this.refH() * this.c.height / this.c.clientHeight : this.c.height);
    gl.uniform1f(u.uHasDisp, this.sim ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sim ? this.sim.a.tex : null);
    gl.uniform1i(u.uDisp, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

const heroEl = $(".hero"), footStrip = $(".footer__strip");
const PAL_HERO = [[.094, .245, .14], [.18, .37, .14], [.38, .39, .12], [.54, .35, .11]];   // Tannengrün · Grün · Oliv · Ocker
const PAL_FOOT = [[.075, .10, .30], [.18, .27, .56], [.40, .23, .66], [.68, .19, .45]];    // Navy · Figma-Blau · Violett · Magenta
const heroGL = new FlowGL($("#heroGL"), { palette: PAL_HERO, scale: window.__hs || .62, zoom: 2.4, trackEl: heroEl });
const footGL = new FlowGL($("#footGL"), { palette: PAL_FOOT, scale: .62, zoom: 2.4, trackEl: footStrip, interactive: false });
footGL.refH = () => heroEl.clientHeight;   // gleiche Musterdichte wie im Header

/* Grain-Kachel einmal erzeugen und pro Bild zufällig verschieben */
(function makeGrain() {
  const g = document.createElement("canvas"); g.width = g.height = 160;
  const x = g.getContext("2d"), img = x.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty("--grain", `url(${g.toDataURL()})`);
})();
let grainT = 0;
function updateGrain(dt) {
  grainT += dt; if (grainT < 1 / 24) return; grainT = 0;
  const r = document.documentElement.style;
  r.setProperty("--gx", Math.floor(Math.random() * 160) + "px");
  r.setProperty("--gy", Math.floor(Math.random() * 160) + "px");
}

/* =========================================================
   4. HERO · Laufschrift in Pillenform (Turbo) + Pille → Kreis
   ========================================================= */
const orbit = $("#orbit"), orbitSvg = $("#orbitSvg"), heroLogo = $("#heroLogo");
const tp = $("#orbitTP"), orbitText = $("#orbitText"), ghostsG = $("#ghosts"), pillPath = $("#pillPath");
const PILL = { hw: 126, r: 84 };
const GHOSTS = Math.min(innerWidth, innerHeight) < 700 ? 3 : 6, ghosts = [];
for (let i = 0; i < GHOSTS; i++) {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("class", "hero__ghost");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
  p.setAttribute("href", "#pillPath"); p.textContent = tp.textContent;
  t.appendChild(p); ghostsG.appendChild(t); ghosts.push({ t, p, on: true });
}
const orbitState = { hw: PILL.hw, r: PILL.r, len: 0, baseFs: 13.5, baseLen: 0, lastD: "" };
function setPill(hw, r) {
  hw = Math.max(0, hw);
  const loop = `L ${hw} ${-r} A ${r} ${r} 0 0 1 ${hw} ${r} L ${-hw} ${r} A ${r} ${r} 0 0 1 ${-hw} ${-r} `;
  const d = `M ${-hw} ${-r} ` + loop + loop;
  if (d !== orbitState.lastD) { pillPath.setAttribute("d", d); orbitState.lastD = d; }
  orbitState.hw = hw; orbitState.r = r; orbitState.len = 4 * hw + 2 * Math.PI * r;
}
function fitOrbitText() {
  setPill(PILL.hw, PILL.r);
  orbitText.style.fontSize = "13.5px";
  const len = orbitText.getComputedTextLength ? orbitText.getComputedTextLength() : 0;
  if (!len) return;
  const L = orbitState.len;
  orbitState.baseFs = clamp(13.5 * (L * .64) / len, 11, 22);
  orbitState.baseLen = len * orbitState.baseFs / 13.5;
}
function setOrbitFont(fs) {
  const v = (Math.round(fs * 4) / 4).toFixed(2) + "px";   // in Viertelpixeln → seltener neues Text-Layout
  if (orbitText.style.fontSize !== v) { orbitText.style.fontSize = v; ghosts.forEach((g) => (g.t.style.fontSize = v)); }
}

const turbo = { on: false, a: 0, k: 0, phase: .83, BASE: 34, MAX: 6000 };
orbit.addEventListener("pointerenter", () => (turbo.on = true));
orbit.addEventListener("pointerleave", () => (turbo.on = false));
orbit.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") turbo.on = true; });
addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") turbo.on = false; });

const sPill = new Spring(120, 9.5);   // Pille → Kreis (bouncy)
let splitP = 0;                        // 0..1  Kreis teilt sich in 5
let ringM = 0;                         // 0..1  Schrift → Kontur
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const orbitRing = $("#orbitRing");

function updateOrbit(dt) {
  const H = HERO_H || (HERO_H = heroEl.offsetHeight);
  // Phase 1: Pille → Kreis
  const m1 = ALT ? 0 : clamp(SCY / (H * .2));
  const s = sPill.step(easeIO(m1), dt);
  const sc = clamp(s);
  const over = s - sc;                                   // Über-/Unterschwinger → Wobble
  const r = PILL.r * (1 + over * .35 + (s < 0 ? s * .2 : 0));
  setPill(PILL.hw * (1 - sc) * (1 - Math.min(0, over) * 0), r);
  // Beim Weiterscrollen: Schrift beschleunigt, wird kleiner und wird zur Kontur (scroll-gesteuert, also auch rückwärts sauber)
  const m2 = ALT ? clamp(SCY / (H * .13)) : clamp((SCY - H * .1) / (H * .17));
  ringM = m2;
  const shrink = 1 - .88 * Math.pow(m2, 1.3);
  const fs = orbitState.baseFs * Math.min(1, (orbitState.len * .9) / (orbitState.baseLen || 1)) * shrink;
  setOrbitFont(Math.max(1, fs));
  const textA = 1 - smooth(.72, 1, m2);
  orbitText.style.opacity = textA.toFixed(3);
  orbitRing.style.opacity = smooth(.55, .95, m2).toFixed(3);

  // Turbo (nur Tempo + Motion-Blur, kein Zoom)
  const active = turbo.on && orbitPush < 1 && splitP < .02;
  turbo.a = damp(turbo.a, active ? 1 : 0, active ? 2.1 : 1.3, dt);
  const k = turbo.a * turbo.a * (3 - 2 * turbo.a);
  turbo.k = k;
  const accel = clamp(SCY / (H * .14));             // Beschleunigung setzt sofort beim Scrollen ein
  const v = turbo.BASE + (turbo.MAX - turbo.BASE) * k + 5600 * Math.pow(accel, 1.15);
  const L = orbitState.len;
  turbo.phase = ((turbo.phase - v * dt / L) % 1 + 1) % 1;
  const off = turbo.phase * L;
  const fadeNow = 1 - clamp(splitP * (ALT ? 7 : 3.5));
  const textOn = textA > .004 && fadeNow > .004;          // unsichtbaren Text gar nicht erst neu setzen
  if (textOn) tp.setAttribute("startOffset", off.toFixed(1));
  const spread = v * .009, gA = Math.max(k, accel) * .3 * textA;
  ghosts.forEach((g, i) => {
    const a = textOn ? gA * Math.pow(1 - i / GHOSTS, 1.5) : 0;
    if (a < .004) { if (g.on) { g.t.style.visibility = "hidden"; g.on = false; } return; }
    if (!g.on) { g.t.style.visibility = ""; g.on = true; }
    let o = off + (i + 1) * spread; while (o >= L) o -= L;
    g.p.setAttribute("startOffset", o.toFixed(1));
    g.t.style.opacity = a.toFixed(3);
  });
  // Logo bleibt beim Hover ruhig

  // Phase 2 beginnt: Text & Logo lösen sich auf
  const fade = fadeNow;
  orbitSvg.style.opacity = fade.toFixed(3);
  const vis = fade > .004 ? "" : "hidden";               // ganz ausgeblendet → aus dem Rendering nehmen
  if (orbitSvg.style.visibility !== vis) orbitSvg.style.visibility = vis;
  heroLogo.style.opacity = (ALT ? 1 - smooth(.05, .6, m2) : 1 - smooth(.05, .7, clamp(sc))).toFixed(3);   // Logo verschwindet früh
  orbit.style.pointerEvents = fade < .5 ? "none" : "";
}
function orbitRect() {
  const o = orbit.getBoundingClientRect();
  const sc = o.width / 480;
  const R = orbitState.r * sc;
  const cx = o.left + o.width / 2, cy = o.top + o.height / 2;
  return { left: cx - R, top: cy - R, width: 2 * R, height: 2 * R };
}

/* =========================================================
   5. SMOOTH SCROLL (Lenis, falls geladen)
   ========================================================= */
let lenis = null;
/* Magnetische Screens: nach dem Scrollen gleitet die Seite zum nächsten Abschnitt */
// Verlauf sicher ändern (in eingebetteten Vorschauen kann das gesperrt sein)
const hist = (m, ...a) => { try { history[m](...a); } catch (e) {} };
const SNAP = { lastInput: 0, busy: false, down: false, pts: [], secs: [], startY: 0, cool: 0 };
const markInput = () => {
  const now = performance.now();
  if (now - SNAP.lastInput > 220) SNAP.startY = scrollY;   // neue Geste: Startpunkt merken
  SNAP.lastInput = now; SNAP.busy = false;
};
/* Seitenwechsel: die erste bewusste Rad-/Trackpad-Bewegung löst sofort das Gleiten zum nächsten Screen aus.
   Der Rest der Geste (Nachlauf) wird geschluckt. In Abschnitten, die höher als der Bildschirm sind, scrollt man frei. */
const PAGING = false;
const PAGE = { acc: 0, last: 0, locked: false, done: true, lastAbs: 0 };
addEventListener("wheel", (e) => {
  const now = performance.now();
  const gap = now - PAGE.last; PAGE.last = now;
  if (!PAGING) {                       // v16: kein automatisches Weiterblättern mehr – man scrollt selbst,
    if (Math.abs(e.deltaY) > 1) markInput();   // eingerastet wird erst nach dem Loslassen
    return;
  }
  if (window.__nosnap || POV.open || !$("#player").hidden || !SNAP.pts.length) return;
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;             // horizontal → Karten
  const dir = Math.sign(e.deltaY), abs = Math.abs(e.deltaY);
  // neuer Impuls = nach einer Pause oder deutlich stärker als das vorige Ereignis (Nachlauf wird nur schwächer)
  const fresh = gap > 260 || abs > PAGE.lastAbs * 1.35 + 4;
  PAGE.lastAbs = abs;
  if (PAGE.locked || (!PAGE.done) || (PAGE.tail && !fresh)) { e._pp = true; e.preventDefault(); return; }    // läuft gerade / Nachlauf
  PAGE.tail = false;
  const y = lenis ? lenis.targetScroll : scrollY;
  const free = SNAP.secs.some((s) => s.bottom - s.top > VH + 40 &&
    (dir > 0 ? y >= s.top - 2 && y < s.bottom - VH - 2 : y > s.top + 2 && y <= s.bottom - VH + 2));
  if (free) { markInput(); return; }                                  // freier Bereich: normal scrollen
  e._pp = true; e.preventDefault();
  if (gap > 180) PAGE.acc = 0;
  PAGE.acc += e.deltaY;
  if (Math.abs(PAGE.acc) < 25) return;                                // winziges Zucken ignorieren
  const ahead = SNAP.pts.filter((q) => (dir > 0 ? q > y + 2 : q < y - 2)).sort((a, b) => dir * (a - b));
  if (!ahead.length) return;
  const target = ahead[0];
  PAGE.locked = true; PAGE.done = false; PAGE.acc = 0;
  SNAP.busy = true; SNAP.startY = target;
  const fin = () => { PAGE.done = true; SNAP.busy = false; SNAP.cool = performance.now() + 200; };
  if (lenis) lenis.scrollTo(target, { duration: .85, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: fin });
  else { window.scrollTo({ top: target, behavior: "smooth" }); setTimeout(fin, 850); }
}, { passive: false });
function updatePage() {   // nach der Fahrt entsperren; ein noch laufender Nachlauf bleibt geschluckt (PAGE.tail)
  if (PAGE.locked && PAGE.done) { PAGE.locked = false; PAGE.tail = performance.now() - PAGE.last < 120; }
  if (PAGE.tail && performance.now() - PAGE.last > 260) PAGE.tail = false;
}
["touchmove", "keydown"].forEach((ev) => addEventListener(ev, markInput, { passive: true }));
addEventListener("scroll", () => { if (!SNAP.busy) SNAP.lastInput = performance.now(); }, { passive: true });
addEventListener("pointerdown", () => (SNAP.down = true), { passive: true });
addEventListener("pointerup", () => { SNAP.down = false; SNAP.lastInput = performance.now(); }, { passive: true });
addEventListener("touchstart", () => (SNAP.down = true), { passive: true });
addEventListener("touchend", () => { SNAP.down = false; SNAP.lastInput = performance.now(); }, { passive: true });
addEventListener("touchstart", () => (SNAP.touch = true), { passive: true });
addEventListener("wheel", () => (SNAP.touch = false), { passive: true });
function cacheSnaps() {
  const els = [".hero", "#leistungen", "#arbeiten", "#ueber", "#kontakt"].map((s) => $(s));
  SNAP.secs = els.map((e) => { const t = docTop(e); return { top: t, bottom: t + e.offsetHeight }; });
  SNAP.pts = SNAP.secs.map((s) => s.top);
  SNAP.pts[SNAP.pts.length - 1] = Math.max(0, document.documentElement.scrollHeight - VH);
}
function updateSnap() {
  if (window.__nosnap || PAGE.locked || POV.open || SNAP.down || (typeof drag !== "undefined" && drag.down) || !$("#player").hidden || !SNAP.pts.length) return;
  const now = performance.now();
  if (SNAP.busy || now - SNAP.lastInput < (lenis ? 32 : 70)) return;   // greift schneller
  const y = lenis ? lenis.targetScroll : SCY;     // dorthin, wo die Bewegung gerade hinläuft – nicht erst warten
  // in einem Abschnitt, der höher als der Bildschirm ist, frei scrollen lassen
  if (SNAP.secs.some((s) => s.bottom - s.top > VH + 40 && y > s.top + 2 && y < s.bottom - VH - 2)) return;
  let p = SNAP.pts.reduce((b, q) => (Math.abs(q - y) < Math.abs(b - y) ? q : b), SNAP.pts[0]);
  // deutlich angeschoben (> 30 % Bildschirm)? → in diese Richtung zum nächsten Abschnitt
  const moved = y - SNAP.startY;
  if (Math.abs(moved) > VH * .18 && Math.abs(moved) < VH * .95) {   // nur echtes Anschieben innerhalb eines Screens
    const dir = Math.sign(moved);
    const ahead = SNAP.pts.filter((q) => dir > 0 ? q > SNAP.startY + 2 : q < SNAP.startY - 2).sort((a, b) => dir * (a - b));
    if (ahead.length) p = ahead[0];
  }
  const d = Math.abs(p - y);
  if (d < 1.5 || d > VH * 1.05) return;
  SNAP.busy = true;
  // Touch: Schwung ist schon ausgelaufen → weich anfahren und weich ankommen, etwas länger (Kreise haben Zeit zum Teilen)
  const dur = SNAP.touch ? .5 + Math.min(.35, Math.abs(p - SCY) / VH * .55) : .26 + Math.min(.22, Math.abs(p - SCY) / VH * .4);
  const ease = SNAP.touch ? (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 : (t) => 1 - Math.pow(1 - t, 3);
  if (lenis) lenis.scrollTo(p, { duration: dur, easing: ease, onComplete: () => { SNAP.busy = false; SNAP.cool = performance.now() + 350; SNAP.startY = SCY; } });
  else { window.scrollTo({ top: p, behavior: "smooth" }); setTimeout(() => (SNAP.busy = false), dur * 1000); }
}
/* Magnetische Screens: nahe an einem Screen wird das Scrollen „zäh",
   und wenn man loslässt, rastet die Seite weich ein. */
function initLenis() {
  if (!window.Lenis || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  lenis = new window.Lenis({
    lerp: .1, smoothWheel: true, gestureOrientation: "vertical",
    // während des Einrastens kleinen Nachlauf ignorieren, bewusstes Weiterscrollen geht durch
    virtualScroll: (data) => {
      if (data.event && data.event._pp) return false;                 // vom Seitenwechsel übernommen
      if ((SNAP.busy || performance.now() < SNAP.cool) && Math.abs(data.deltaY) <= 24) return false;
      // über den Karten: vertikal etwas schwerer, Schräg-Anteile deutlich gebremst → kein Mitzittern
      if (data.event && data.event.target && data.event.target.closest && data.event.target.closest("#trackWrap")) {
        const diag = Math.abs(data.deltaX) > Math.abs(data.deltaY) * .35;
        data.deltaY *= diag ? .25 : .6;
      }
      return true;
    }
  });
}
function scrollToY(y, opts = {}) {
  if (lenis) lenis.scrollTo(y, { duration: opts.duration ?? 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), immediate: !!opts.immediate });
  else window.scrollTo({ top: y, behavior: opts.immediate ? "auto" : "smooth" });
}
const docTop = (el) => el.getBoundingClientRect().top + scrollY;

/* =========================================================
   6. NAV (ohne Hintergrund)
   ========================================================= */
const nav = $("#nav"), navBrand = $("#navBrand");
$("#navBrand").addEventListener("click", (e) => { e.preventDefault(); if (POV.open) { closeProject({ fromHistory: true }); hist("replaceState", null, "", location.pathname); } SNAP.busy = true; SNAP.startY = 0; setTimeout(() => { SNAP.busy = false; SNAP.startY = 0; }, 2100); scrollToY(0, { duration: 2 }); });
$$(".nav__links a, .nav__icons a").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  if (POV.open) { POV.open = true; closeProject({ fromHistory: true }); hist("replaceState", null, "", location.pathname); }
  const t = $(a.getAttribute("href"));
  const y = t.id === "kontakt" ? document.documentElement.scrollHeight - VH : docTop(t);
  SNAP.busy = true; SNAP.startY = y; setTimeout(() => { SNAP.busy = false; SNAP.startY = y; }, 1700);
  scrollToY(y);
}));
const navSecs = ["leistungen", "arbeiten", "ueber", "kontakt"].map((id) => $("#" + id));
let navTops = [], navCut = -1;
const navLinks = $$(".nav__links a, .nav__icons a");
let WORK_TOP = 0, WORK_H = 0;
function cacheNav() {
  navTops = navSecs.map((s) => docTop(s)); cacheSnaps(); if (typeof layoutDots === "function") layoutDots();
  if (typeof trackWrap !== "undefined") { WORK_TOP = docTop(trackWrap); WORK_H = trackWrap.offsetHeight; }
  HERO_H = heroEl.offsetHeight; NAV_H = nav.offsetHeight;
}
// statt jede Sekunde nachzumessen (kurzer Ruckler): nur wenn sich die Seitenhöhe wirklich ändert
let cacheQ = 0;
new ResizeObserver(() => { if (!cacheQ) cacheQ = requestAnimationFrame(() => { cacheQ = 0; cacheNav(); }); }).observe(document.body);
function updateNav() {
  const hb = HERO_H - SCY, nh = NAV_H || (NAV_H = nav.offsetHeight);
  const cut = clamp(hb, 0, nh);
  if (cut !== navCut) { navCut = cut; nav.style.setProperty("--navcut", cut + "px"); }
  let cur = null;
  navTops.forEach((t, i) => { if (t - SCY < VH * .45) cur = navSecs[i].id; });
  navLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.sec === cur));
}

/* =========================================================
   7. REVEALS
   ========================================================= */
$$(".reveal-title").forEach((h) => {
  const txt = h.textContent.trim();
  h.setAttribute("aria-label", txt);
  h.innerHTML = [...txt].map((c, i) =>
    `<span class="mask" aria-hidden="true"><span class="ch${/[ÜüÄäÖö]/.test(c) ? " uml" : ""}" style="--i:${i}">${c === " " ? "&nbsp;" : c.normalize("NFD")[0]}</span></span>`).join("");
});
const io = new IntersectionObserver((ents) => ents.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: .25, rootMargin: "0px 0px -6% 0px" });
$$(".reveal-title, .reveal").forEach((el) => io.observe(el));

/* =========================================================
   8. LEISTUNGEN · Text-Wechsel
   ========================================================= */
const descEl = $("#serviceDesc"), listEl = $("#serviceList"), leistBody = $(".leistungen__body");
let activeService = "Grafik", swapTimer = null, shownService = null;
function renderService(cat, instant) {
  const d = SERVICES[cat];
  const words = d.desc.split(" ");
  descEl.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}${i < words.length - 1 ? " " : ""}</span>`).join("");
  listEl.innerHTML = d.list.map((l, i) => `<li style="--i:${words.length * .5 + i * 4}">${l}</li>`).join("");
  if (instant) return;
  descEl.classList.add("pre"); listEl.classList.add("pre");
  void descEl.offsetWidth;
  descEl.classList.remove("pre", "out"); listEl.classList.remove("pre", "out");
}
function setService(cat) {
  if (cat === activeService && shownService === cat) return;
  activeService = cat;
  if (swapTimer) return;
  descEl.classList.add("out"); listEl.classList.add("out");
  swapTimer = setTimeout(() => { swapTimer = null; shownService = activeService; renderService(activeService); }, 260);
}
renderService(activeService, true); shownService = activeService;

/* =========================================================
   9. CHIPS · Pille → Kreis → 5 Kreise → 5 Pillen (liquid)
   ========================================================= */
const chipsLayer = $("#chips"), goo = $("#goo"), gooG = $("#gooG");
/* Flüssige Kontur (Metaballs) auf der Grafikkarte – gleicher Look wie der frühere SVG-Filter, aber ohne Ruckeln */
const GooGL = (() => {
  const cv = document.createElement("canvas");
  cv.className = "goo-gl"; chipsLayer.insertBefore(cv, chipsLayer.firstChild);
  const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  goo.style.display = "none";
  const vs = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  const fs = `precision mediump float;
    uniform vec3 uC[5]; uniform vec2 uB[5]; uniform vec2 uS[5]; uniform int uN; uniform float uK; uniform float uW; uniform vec2 uRes;
    float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
    void main(){
      vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
      float d = 1e5;
      for (int i = 0; i < 5; i++) {
        if (i >= uN) break;
        vec2 q = (p - uC[i].xy) / uS[i];                 // leichtes Stauchen/Strecken wie vorher
        // Pillenform (abgerundetes Rechteck) statt Kreis: passt exakt zur Form des Chips
        vec2 b = uB[i]; float r = min(b.x, b.y);
        vec2 e = abs(q) - b + r;
        float di = (length(max(e, 0.)) + min(max(e.x, e.y), 0.) - r) * min(uS[i].x, uS[i].y);
        d = smin(d, di, uK);
      }
      float a = 1. - smoothstep(uW * .5 - .6, uW * .5 + .6, abs(d));
      gl_FragColor = vec4(vec3(.8) * a, a);   // exakt --ink (#ccc), damit beim Übergang nichts dunkler wird
    }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uC", "uB", "uS", "uN", "uK", "uW", "uRes"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
  const C = new Float32Array(15), B = new Float32Array(10), S = new Float32Array(10);
  let shown = false;
  return {
    draw(list) {
      if (!list.length) { if (shown) { cv.style.display = "none"; shown = false; } return; }
      if (!shown) { cv.style.display = "block"; shown = true; }
      // echte Größe der Ebene (ohne Scrollbalken) – sonst ist die Kontur gegenüber den Kreisen seitlich verschoben
      const dpr = Math.min(devicePixelRatio || 1, 2), cw = cv.clientWidth || chipsLayer.clientWidth, ch = cv.clientHeight || chipsLayer.clientHeight;
      const w = Math.round(cw * dpr), h = Math.round(ch * dpr), sx = w / cw, sy = h / ch;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      for (let i = 0; i < 5; i++) {
        const b = list[i] || { x: -1e4, y: -1e4, r: 1, hw: 1, hh: 1, sx: 1, sy: 1 };
        C[i * 3] = b.x * sx; C[i * 3 + 1] = b.y * sy; C[i * 3 + 2] = b.r * dpr; B[i * 2] = (b.hw ?? b.r) * dpr; B[i * 2 + 1] = (b.hh ?? b.r) * dpr; S[i * 2] = b.sx; S[i * 2 + 1] = b.sy;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform3fv(U.uC, C); gl.uniform2fv(U.uB, B); gl.uniform2fv(U.uS, S); gl.uniform1i(U.uN, Math.min(5, list.length));
      gl.uniform1f(U.uK, 20 * dpr); gl.uniform1f(U.uW, 1. * dpr); gl.uniform2f(U.uRes, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
})();
const circleSlots = $$("#slotCircles .slot"), pillSlots = $$("#slotPills .slot");
const filters = new Set();
const SVGNS = "http://www.w3.org/2000/svg";
// Bei jedem Laden andere Reihenfolge und Geschwindigkeiten für die Zellteilung
const SPLIT = CATS.map(() => ({ delay: Math.random() * .3, k: 150 + Math.random() * 130 }));
let splitArmed = true;
function reshuffleSplit() {
  SPLIT.forEach((s, i) => {
    s.delay = Math.random() * .3; s.k = 150 + Math.random() * 130;
    const sp = chips[i] && chips[i].s2;
    if (sp) { sp.k = s.k; sp.c = 2 * Math.sqrt(s.k) * (.72 + Math.random() * .16); }
  });
}
const chips = CATS.map((cat, i) => {
  const el = document.createElement("button");
  el.type = "button"; el.className = "chip"; el.dataset.cat = cat;
  el.innerHTML = `<span class="chip__fill"></span><span class="chip__label">${cat}</span>`;
  chipsLayer.appendChild(el);
  const blob = document.createElementNS(SVGNS, "rect");
  gooG.appendChild(blob);
  const c = { el, cat, i, blob, label: el.lastElementChild, s2: ALT ? new Spring(170, 22) : new Spring(SPLIT[i].k, 2 * Math.sqrt(SPLIT[i].k) * (.72 + Math.random() * .16)), s3: new Spring(230, 28), last: "" };
  el.addEventListener("pointerenter", () => { if (c.mode === "circle") setService(cat); });
  el.addEventListener("click", () => { if (c.mode === "pill") toggleFilter(cat); else if (c.mode === "circle") setService(cat); });
  return c;
});

function sizeSlots() {
  const avail = VW - PAD() * 2;
  const gc = parseFloat(getComputedStyle($("#slotCircles")).columnGap) || 14;
  const gp = parseFloat(getComputedStyle($("#slotPills")).columnGap) || 10;
  document.documentElement.style.setProperty("--cs", Math.floor(Math.min(131, (avail - 4 * gc) / 5)) + "px");
  document.documentElement.style.setProperty("--pw", Math.floor(Math.min(143, (avail - 4 * gp) / 5)) + "px");
}
const lerpRect = (a, b, t) => ({ left: lerp(a.left, b.left, t), top: lerp(a.top, b.top, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) });

let scrollDir = 1, lastScrollY = 0, orbitPush = 0;
function updateChips(dt) {
  if (SCY !== lastScrollY) { scrollDir = SCY < lastScrollY ? -1 : 1; lastScrollY = SCY; }
  const H = HERO_H || (HERO_H = heroEl.offsetHeight);
  const c0 = circleSlots[0].getBoundingClientRect();
  const circleDoc = c0.top + SCY + c0.height / 2;
  const p0 = pillSlots[0].getBoundingClientRect();
  // alle Messungen vor dem ersten Schreibzugriff (sonst erzwingt jede Messung ein neues Layout)
  const As = circleSlots.map((s) => s.getBoundingClientRect()), Bs = pillSlots.map((s) => s.getBoundingClientRect());
  const bodyTop = leistBody.getBoundingClientRect().top;
  const pillDoc = p0.top + SCY + p0.height / 2;

  // Nav-Linie als „Schieber": Abstand Linie→Kreis ≥ halber Abstand Navtext→Linie
  const navR = nav.getBoundingClientRect(), brandR = navBrand.getBoundingClientRect();
  const lineY = navR.bottom, pushY = lineY + Math.max(12, (lineY - brandR.bottom) * .6);
  // Phase 2: der Laufschrift-Kreis klebt an der Linie, wird geschoben und teilt sich in 5
  const Oraw = orbitRect(); Oraw.top -= orbitPush;
  let altP0 = null, altHeroBottom = 0;
  if (!ALT) {
    const pushed1 = Math.max(0, pushY - Oraw.top);
    splitP = clamp(pushed1 / Math.max(140, VH * .23));
    // jedes Mal, wenn der Kreis wieder ganz zusammen ist: neue Reihenfolge und neue Tempi
    if (splitP === 0 && !splitArmed && chips.every((c) => c.s2.rest(0))) { reshuffleSplit(); splitArmed = true; }
    if (splitP > 0) splitArmed = false;
    if (Math.abs(pushed1 - orbitPush) > .1) { orbitPush = pushed1; orbit.style.transform = `translate(-50%, calc(-50% + ${pushed1.toFixed(1)}px))`; }
  } else {
    // Alternative: die Pille bleibt im Hero, schnürt sich zu 5 Tropfen ein (groß · klein · winzig · klein · groß)
    const s0 = H * .12, s1 = Math.max(s0 + 240, circleDoc - VH * .5);
    splitP = clamp((SCY - s0) / (s1 - s0));
    const ob = orbit.getBoundingClientRect(), k = ob.width / 480;
    const D = 2 * PILL.r * k, W = 2 * (PILL.hw + PILL.r) * k, cx = ob.left + ob.width / 2, cy = ob.top + ob.height / 2;
    const gap = (W - D) / 4;
    altP0 = CATS.map((_, i) => ({ left: cx + (i - 2) * gap - D / 2, top: cy - D / 2, width: D, height: D }));
    altHeroBottom = H - SCY;
  }
  // Phase 3: Kreise → Pillen
  const c0top = c0.top;                                     // Oberkante der Kreise (Viewport)
  const pushed = Math.max(0, pushY - c0top);                // wie weit die Linie schon „drückt"
  const p3 = clamp(pushed / Math.max(140, VH * .23));

  const O = { left: Oraw.left, top: Math.max(Oraw.top, pushY), width: Oraw.width, height: Oraw.height };
  const gapToText = bodyTop - (Math.max(As[0].top, pushY) + As[0].height);
  const bodyA = clamp((gapToText - 6) / 60);
  if (Math.abs(bodyA - (leistBody._a ?? 1)) > .003) { leistBody._a = bodyA; leistBody.style.opacity = bodyA.toFixed(3); }
  const st = .05, span = 1 - st * 4;
  const st3 = .035, span3 = 1 - st3 * 4;
  let anyGoo = false;
  const blobs = [];
  const SY = SCY;   // Kreise/Pillen werden in Dokument-Koordinaten gesetzt
  for (const c of chips) {
    // Reihenfolge: mittlerer Kreis zuerst, dann nach außen (wie eine Zellteilung)
    const t2 = ALT ? clamp((splitP - [0, .025, .05, .025, 0][c.i]) / .95)   // außen zuerst – wie Tropfen, die abreißen
                   : clamp((splitP - SPLIT[c.i].delay) / .7);  // zufällige Verzögerung je Kreis
    const t3 = clamp((p3 - c.i * st3) / span3);          // linear – die Feder sorgt für das Auslaufen
    const e2 = c.s2.step(t2, dt), e3 = c.s3.step(t3, dt);
    const A = As[c.i], B = Bs[c.i];
    // geschobene Kreisposition: nie über der Linie
    const Ap = { left: A.left, top: Math.max(A.top, pushY), width: A.width, height: A.height };
    let R;
    if (ALT) {
      const SZ = [1, .55, .3, .55, 1][c.i], d1 = A.width * SZ;
      const P1 = { left: A.left + A.width / 2 - d1 / 2, top: altHeroBottom - d1 / 2, width: d1, height: d1 };
      const tgt = e3 > 0 || pushed > 0 ? Ap : A;
      if (e2 <= .5) R = lerpRect(altP0[c.i], P1, easeIO(clamp(e2 / .5)));
      else { const t = (e2 - .5) / .5; R = lerpRect(P1, tgt, t <= 1 ? easeIO(t) : t); }
    } else R = lerpRect(O, e3 > 0 || pushed > 0 ? Ap : A, e2);
    R = lerpRect(R, B, e3);
    R.width = Math.max(10, R.width); R.height = Math.max(10, R.height);

    const pre = t2 === 0 && (c.s2.rest(0) || c.s2.x < .18);
    const rest2 = c.s2.rest(t2) && (t2 === 0 || t2 === 1);
    const rest3 = c.s3.rest(t3) && (t3 === 0 || t3 === 1);
    const flying = !pre && !rest2;                      // Goo nur bei der Zellteilung aus dem Hero
    const settled = !pre && rest2 && rest3;
    c.mode = pre ? "none" : e3 > .5 ? "pill" : (e2 > .85 ? "circle" : "none");

    // Squash & Stretch entlang der Bewegungsrichtung
    const dir2x = A.left - O.left, dir2y = A.top - O.top, dir3x = B.left - A.left, dir3y = B.top - A.top;
    const vx = c.s2.v * dir2x, vy = c.s2.v * dir2y;
    const speed = Math.hypot(vx, vy);
    const str = ALT ? 0 : clamp(speed * .00009, 0, .18);
    const ang = Math.atan2(vy, vx) * 180 / Math.PI;
    const sx = 1 + str, sy = 1 - str * .55;

    const visible = !pre && R.top + R.height > -80 && R.top < VH + 80;
    const on = c.mode === "pill" ? filters.has(c.cat) : c.mode === "circle" && c.cat === activeService && pushed <= 0;
    const lab = pre ? 0 : clamp((e2 - .7) / .3) ;
    const key = `${R.left.toFixed(1)}|${(R.top + SY).toFixed(1)}|${R.width.toFixed(1)}|${R.height.toFixed(1)}|${str.toFixed(3)}|${ang.toFixed(0)}|${visible}|${flying}|${c.mode}|${on}|${lab.toFixed(2)}`;
    if (key !== c.last) {
      c.last = key;
      if (settled || str < .002) {
        c.el.style.transform = `translate3d(${Math.round(R.left)}px, ${Math.round(R.top + SY)}px, 0)`;
        c.el.style.width = Math.round(R.width) + "px"; c.el.style.height = Math.round(R.height) + "px";
      } else {
        c.el.style.transform = `translate3d(${R.left.toFixed(2)}px, ${(R.top + SY).toFixed(2)}px, 0) rotate(${ang.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${(-ang).toFixed(1)}deg)`;
        c.el.style.width = R.width.toFixed(2) + "px"; c.el.style.height = R.height.toFixed(2) + "px";
      }
      c.el.classList.toggle("is-hidden", !visible);
      c.el.classList.toggle("is-flying", flying);
      c.el.classList.toggle("is-pill", c.mode === "pill");
      c.el.classList.toggle("is-on", on);
      c.label.style.opacity = lab.toFixed(3);
      c.el.style.fontSize = Math.min(lerp(20, 18, e3), R.width / lerp(5.6, VW < 600 ? 5.1 : 6.6, clamp(e3))).toFixed(1) + "px";   // Handy: Schrift in den Pillen größer
      // Goo-Blob
      if (!GooGL && flying && visible) {
        const cx = R.left + R.width / 2, cy = R.top + R.height / 2;
        c.blob.setAttribute("x", (-R.width / 2).toFixed(2)); c.blob.setAttribute("y", (-R.height / 2).toFixed(2));
        c.blob.setAttribute("width", R.width.toFixed(2)); c.blob.setAttribute("height", R.height.toFixed(2));
        c.blob.setAttribute("rx", (Math.min(R.width, R.height) / 2).toFixed(2));
        c.blob.setAttribute("transform", `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${ang.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) rotate(${(-ang).toFixed(1)})`);
        c.blob.style.display = "";
      } else c.blob.style.display = "none";
    }
    if (flying && visible) {
      anyGoo = true;
      // Stauchung nur entlang der Hauptachsen nähern (reicht für die kleinen Werte)
      const ca = Math.abs(Math.cos(ang * Math.PI / 180)), sa = 1 - ca;
      blobs.push({ x: R.left + R.width / 2, y: R.top + R.height / 2, r: Math.min(R.width, R.height) / 2, hw: R.width / 2, hh: R.height / 2,
                   sx: lerp(sy, sx, ca), sy: lerp(sy, sx, sa) });
    }
  }
  if (GooGL) GooGL.draw(blobs); else goo.classList.toggle("on", anyGoo);
}

/* =========================================================
   10. ARBEITEN · Reihe (optional horizontal) / Raster + Filter
   ========================================================= */
// BN Canyon hat keine Umlaute → Grundbuchstabe + eigene Punkte (wie bei „Über mich")
const umlTitle = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
  .replace(/[ÄÖÜäöü]/g, (c) => `<span class="uml">${c.normalize("NFD")[0]}</span>`);
// Überschriften nie abschneiden: ist ein Wort breiter als der Platz, wird die Schrift passend verkleinert
function fitTitle(el) {
  if (!el || !el.clientWidth) return;
  el.style.fontSize = "";
  const fs = parseFloat(getComputedStyle(el).fontSize), w = el.scrollWidth, cw = el.clientWidth;
  if (w > cw + 1) el.style.fontSize = Math.floor(fs * cw / w * 0.98 * 10) / 10 + "px";
}
const secWork = $("#arbeiten"), track = $("#track"), trackWrap = $("#trackWrap");
const dotsEl = $("#dots"), dotsFill = $("#dotsFill");
track.innerHTML = PROJECTS.map((p, i) => `
  <article class="card" data-tags="${p.tags.join(",")}">
    <div class="card__media">
      <img class="card__img" src="${IMG(p.img)}" alt="${p.title}" loading="lazy" draggable="false" style="object-position:${p.pos}" />
      <div class="card__shade"></div>
    </div>
    <div class="card__info">
      <span class="card__year">${p.year}</span>
      <h3 class="card__title">${umlTitle(p.title)}</h3>
      <div class="card__tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      <p class="card__desc">${p.desc}</p>
    </div>
  </article>`).join("");
const cards = $$(".card", track);
if (!cards.length) { track.insertAdjacentHTML("afterend", '<p class="work-empty">Projekte folgen.</p>'); secWork.classList.add("is-empty"); }
const thisPage = location.pathname.split("/").pop() || "portfolio-v13.html";
cards.forEach((c, i) => c.addEventListener("click", () => openProject(i)));
// Rückkehr von einer Projektseite: Position wiederherstellen
try {
  const back = JSON.parse(sessionStorage.getItem("pp-return") || "null");
  if (back && back.page === thisPage && /von-projekt/.test(location.hash)) {
    hist("replaceState", null, "", location.pathname);
    // genau zu „Arbeiten" zurück (auch wenn sich Höhen inzwischen geändert haben) und den Magneten nicht täuschen
    const restore = () => {
      const y = back.sec === "arbeiten" ? docTop($("#arbeiten")) : back.y;
      SNAP.startY = y; SNAP.cool = performance.now() + 600;
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      trackWrap.scrollLeft = back.sl || 0; work.snapTo = null;
    };
    requestAnimationFrame(restore);
    addEventListener("load", () => requestAnimationFrame(restore), { once: true });
    setTimeout(restore, 350);
  }
} catch (e) {}
const work = { wrote: -1, view: "row", skew: 0, lastSL: 0, gap: 20, hInput: 0, snapTo: null, idx: -1, n: -1, fill: 0 };
const isGrid = () => false;

function sizeCards() {
  const meta = $(".arbeiten__meta");
  const above = trackWrap.getBoundingClientRect().top - secWork.getBoundingClientRect().top;   // Abschnitt beginnt oben am Bildschirm
  if (VW < 900) {                                    // Handy: Karten füllen den Screen, Text darunter
    track.style.setProperty("--ch", "auto");
    const icon = $(".nav__icons a"), ir = icon ? icon.getBoundingClientRect() : { top: 50 };
    const edge = Math.max(24, ir.top);                // Abstand Icons ↔ oberer Rand
    let cw = Math.round(Math.min(230, VW * .58));
    for (let pass = 0; pass < 2; pass++) {
      track.style.setProperty("--cw", cw + "px");
      const infoH = Math.max(...cards.map((c) => c.querySelector(".card__info").offsetHeight));
      const mediaH = VH - edge - meta.offsetHeight - above - infoH;
      cw = Math.round(clamp(mediaH * .8, 170, VW * .8));
    }
    track.style.setProperty("--cw", cw + "px");
    // nachmessen: der Fortschritts-Scroller unten muss im Screen liegen (Text bricht bei schmaleren Karten länger um)
    for (let pass = 0; pass < 4; pass++) {
      const over = meta.getBoundingClientRect().bottom - secWork.getBoundingClientRect().top - (VH - edge);
      if (over <= 0 || cw <= 150) break;
      cw = Math.max(150, Math.round(cw - over / 1.25 - 4));
      track.style.setProperty("--cw", cw + "px");
    }
  } else {
    const ch = clamp(VH - above - meta.offsetHeight - 30, 240, 615);
    track.style.setProperty("--ch", ch + "px");
    track.style.setProperty("--cw", Math.round(ch * 400 / 615) + "px");
  }
  requestAnimationFrame(() => cards.forEach((c) => fitTitle(c.querySelector(".card__title"))));
  work.gap = VW < 900 ? 18 : 20;
  track.style.gap = isGrid() ? "" : work.gap + "px";
  const cw = parseFloat(track.style.getPropertyValue("--cw")) || 400;
  layoutDots();
}

/* FLIP mit Feder-Easing */
function flip(mutate, { stagger = 0 } = {}) {
  const first = new Map(cards.map((c) => [c, c.hidden ? null : c.getBoundingClientRect()]));
  mutate();
  // Alle verschobenen Karten laufen auf derselben Federkurve (ohne Versatz). Das Überschießen wird so begrenzt,
  // dass sich zwei Nachbarn höchstens um ~40 % der Lücke näher kommen – sie berühren sich nie.
  const moves = [];
  let k = 0, maxRel = 0, prev = null;
  cards.forEach((c) => {
    if (c.hidden) return;
    const l = c.getBoundingClientRect(), f = first.get(c);
    if (!f) {
      c.animate([{ opacity: 0, transform: "scale(.6) translateY(30px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: 650, easing: SPRING_EASE, delay: (k++) * stagger + 140, fill: "backwards" });   // kurz nachdem die anderen losgelaufen sind
      prev = { dx: 0, dy: 0 };
      return;
    }
    const m = { c, dx: f.left - l.left, dy: f.top - l.top, sx: f.width / l.width, sy: f.height / l.height };
    if (prev) maxRel = Math.max(maxRel, Math.hypot(m.dx - prev.dx, m.dy - prev.dy));
    prev = m; moves.push(m);
  });
  const frames = (m) => springFrames(maxRel, (work.gap || 20) * .4, (q) => ({ transformOrigin: "0 0",
    transform: `translate(${(m.dx * (1 - q)).toFixed(2)}px, ${(m.dy * (1 - q)).toFixed(2)}px) scale(${(m.sx + (1 - m.sx) * q).toFixed(4)}, ${(m.sy + (1 - m.sy) * q).toFixed(4)})` }));
  moves.forEach((m) => {
    if (Math.abs(m.dx) < .5 && Math.abs(m.dy) < .5 && Math.abs(m.sx - 1) < .01 && Math.abs(m.sy - 1) < .01) return;
    m.c.animate(frames(m), { duration: 820, easing: "linear", fill: "backwards" });
  });
}


function toggleFilter(cat) {
  filters.has(cat) ? filters.delete(cat) : filters.add(cat);
  const match = (c) => filters.size === 0 || c.dataset.tags.split(",").some((t) => filters.has(t));
  const leaving = cards.filter((c) => !c.hidden && !match(c));
  const outs = leaving.map((c) => c.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.82) translateY(20px)", filter: "blur(6px)" }], { duration: 200, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }));
  setTimeout(() => {
    outs.forEach((a) => a.cancel());
    flip(() => { cards.forEach((c) => (c.hidden = !match(c))); }, { stagger: 18 });
    trackWrap.scrollLeft = 0; work.snapTo = 0; layoutDots();
  }, leaving.length ? 170 : 0);
}

/* Reihe: Ziehen + Schwung, Pfeile */
const drag = { down: false, moved: false, sx: 0, sl: 0, v: 0, lx: 0, lt: 0, glide: 0 };
trackWrap.addEventListener("pointerdown", (e) => {
  if (isGrid() || e.pointerType !== "mouse" || e.button !== 0) return;
  drag.down = true; drag.moved = false; drag.sx = e.clientX; drag.sl = trackWrap.scrollLeft; drag.lx = e.clientX; drag.lt = performance.now(); drag.v = 0; drag.glide = 0;
});
addEventListener("pointermove", (e) => {
  if (!drag.down) return;
  const dx = e.clientX - drag.sx;
  if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; trackWrap.classList.add("is-drag"); }
  if (!drag.moved) return;
  const now = performance.now();
  drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
  trackWrap.scrollLeft = drag.sl - dx * 1.35;
  work.hInput = now; work.snapTo = null;
});
addEventListener("pointerup", () => {
  if (!drag.down) return;
  drag.down = false; trackWrap.classList.remove("is-drag");
  if (drag.moved) { drag.glide = -drag.v * 24; work.hInput = performance.now(); }   // px pro Frame
});
trackWrap.addEventListener("click", (e) => { if (drag.moved) { e.preventDefault(); e.stopPropagation(); drag.moved = false; } }, true);
trackWrap.addEventListener("wheel", (e) => {
  const now = performance.now();
  const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
  if (!horiz) return;                                  // vertikal → Seite scrollt (etwas gebremst, siehe Lenis)
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  e.preventDefault(); e.stopPropagation();           // Seite (und Lenis) bekommen nichts vom horizontalen Wischen
  trackWrap.scrollLeft += dx * 1.8;
  work.hInput = now; work.snapTo = null;
}, { passive: false });

const cardSpr = cards.map(() => new Spring(230, 28));
function updateCardsIn(dt) {
  const wr = trackWrap.getBoundingClientRect();
  if (wr.top > VH * 1.2 && cardSpr[0].x === 0 && cardSpr[0].init) return;
  const pc = clamp((VH * .98 - wr.top) / (VH * .42));
  let k = 0;
  cards.forEach((c, i) => {
    if (c.hidden) return;
    const t = clamp(pc * 1.3 - Math.max(0, 4 - k) * .06); k++;   // rechte Karten führen → kein Überlappen
    const e = cardSpr[i].step(t, dt);
    const settled = t === 1 && cardSpr[i].rest(1);
    const tf = settled ? "" : `translate3d(${(-(1 - e) * VW * .75).toFixed(1)}px,0,0)`;
    const op = settled ? "" : clamp(e * 1.6).toFixed(3);
    if (c._tf !== tf) { c._tf = tf; c.style.transform = tf; c.style.opacity = op; }
  });
}
/* Fortschrittslinie ziehen */
const dotsDrag = { on: false };
function dotsSeek(e) {
  const r = dotsEl.getBoundingClientRect();
  const f = clamp((e.clientX - r.left) / r.width);
  const max = trackWrap.scrollWidth - trackWrap.clientWidth;
  const S = stops(), p = clamp(f * S.length - 1, 0, S.length - 1), j0 = Math.floor(p);
  trackWrap.scrollLeft = clamp(j0 >= S.length - 1 ? S[S.length - 1] : lerp(S[j0], S[j0 + 1], p - j0), 0, max);
  work.hInput = performance.now(); work.snapTo = null; drag.glide = 0;
}
dotsEl.addEventListener("pointerdown", (e) => { dotsDrag.on = true; dotsEl.classList.add("is-drag"); dotsEl.setPointerCapture(e.pointerId); dotsSeek(e); });
dotsEl.addEventListener("pointermove", (e) => { if (dotsDrag.on) dotsSeek(e); });
const endDots = () => { if (!dotsDrag.on) return; dotsDrag.on = false; dotsEl.classList.remove("is-drag"); work.hInput = 0; };
dotsEl.addEventListener("pointerup", endDots); dotsEl.addEventListener("pointercancel", endDots);

/* Punkte: so viele wie sichtbare Projekte, Breite = Grafik-Pille links bis Ideen-Pille rechts */
function visibleCards() { return cards.filter((c) => !c.hidden); }
function stops() {                                       // Einrastpositionen: jede Karte links bündig, die letzte rechts bündig
  const max = Math.max(0, trackWrap.scrollWidth - trackWrap.clientWidth), step = cardStep(), s = [];
  for (let k = 0; k * step < max - 4; k++) s.push(k * step);
  s.push(max);
  return s;
}
function stopPos(sl, S) {                                 // kontinuierliche Position zwischen den Einrastpunkten
  for (let j = 0; j < S.length - 1; j++) if (sl <= S[j + 1]) return j + clamp((sl - S[j]) / Math.max(1, S[j + 1] - S[j]));
  return S.length - 1;
}
function cardStep() { const v = visibleCards(); return v.length > 1 ? v[1].offsetLeft - v[0].offsetLeft : (v[0]?.offsetWidth || 400) + work.gap; }
function layoutDots() {
  const chs = $$("#arbeiten .display .ch");
  const span = chs.length ? chs[chs.length - 1].getBoundingClientRect().right - chs[0].getBoundingClientRect().left : 400;
  dotsEl.style.width = Math.max(120, span) + "px";
  const n = stops().length;                              // Abschnitte = Einrastpositionen
  if (n !== work.n) {
    work.n = n; work.idx = -1;
    $$(".dot", dotsEl).forEach((d) => d.remove());
    for (let k = 0; k <= n; k++) {
      const d = document.createElement("button");
      d.type = "button"; d.className = "dot"; d.setAttribute("aria-label", "Projekt " + (k + 1));
      d.style.left = (k / Math.max(1, n) * 100) + "%";
      dotsEl.appendChild(d);
    }
  }
}
function updateDots(sl, dt) {
  const S = stops();
  if (S.length !== work.n) layoutDots();
  const n = work.n; if (n < 1) return;
  const pos = stopPos(sl, S);
  const idx = Math.round(pos);
  // Fortschrittslinie rastet an den Punkten ein
  const target = dotsDrag.on ? (pos + 1) / n : (idx + 1) / n;     // erste Ansicht: Strich vom 1. zum 2. Punkt
  work.fill = dotsDrag.on ? target : damp(work.fill, target, 14, dt);
  dotsFill.style.width = (work.fill * 100).toFixed(2) + "%";
  if (idx !== work.idx) {
    work.idx = idx;
    $$(".dot", dotsEl).forEach((d, k) => { d.classList.toggle("is-past", k <= idx + 1); d.classList.remove("is-active"); });
  }
}

// Touch: natives Wischen der Karten nicht vom Einrasten zurückziehen lassen
let touchOnTrack = false, touchEndT = -1e9;
trackWrap.addEventListener("touchstart", () => { touchOnTrack = true; work.snapTo = null; drag.glide = 0; work.hInput = performance.now(); }, { passive: true });
addEventListener("touchend", () => { if (touchOnTrack) { touchOnTrack = false; touchEndT = performance.now(); work.hInput = touchEndT; } }, { passive: true });
addEventListener("touchcancel", () => { touchOnTrack = false; }, { passive: true });
trackWrap.addEventListener("scroll", () => {
  // eigenes Setzen (Einrasten) ignorieren; Finger oder Nachschwung zählen als Eingabe
  if (Math.abs(trackWrap.scrollLeft - work.wrote) < 1) return;
  if (touchOnTrack || performance.now() - touchEndT < 2500) { work.hInput = performance.now(); work.snapTo = null; }
}, { passive: true });
function updateWork(dt) {
  // weit weg vom Abschnitt und nichts in Bewegung → gar nichts messen (spart erzwungene Layouts beim Scrollen)
  const wTop = WORK_TOP - SCY;
  if (!cards.length) return;   // noch keine Projekte im CMS
  if ((wTop > VH * 1.25 || wTop + WORK_H < -VH * .25) && cardSpr[0].init && Math.abs(drag.glide) < .1 && !drag.down && work.snapTo !== null) return;
  updateCardsIn(dt);
  if (isGrid()) return;
  if (Math.abs(drag.glide) > .1) { trackWrap.scrollLeft += drag.glide; drag.glide *= Math.pow(.9, dt * 60); }
  const max = trackWrap.scrollWidth - trackWrap.clientWidth;
  // Karten rasten ein: nach dem Wischen/Ziehen zur nächsten Karte gleiten
  if (!drag.down && !dotsDrag.on && !touchOnTrack && Math.abs(drag.glide) < 1.2 && performance.now() - work.hInput > 110) {
    const step = cardStep();
    if (work.snapTo === null) { const S = stops(); work.snapTo = S[Math.round(stopPos(trackWrap.scrollLeft, S))]; }
    const cur = trackWrap.scrollLeft, nx = damp(cur, work.snapTo, 11, dt);
    if (Math.abs(work.snapTo - cur) > .5) { drag.glide = 0; trackWrap.scrollLeft = Math.abs(work.snapTo - nx) < .5 ? work.snapTo : nx; work.wrote = trackWrap.scrollLeft; }
  }
  updateDots(trackWrap.scrollLeft, dt);
}

/* =========================================================
   11. FOOTER · Wortmarke
   ========================================================= */
const wordmark = $("#wordmark"), wmText = $("#wordmarkText");
// Unterschneidung: in BN Canyon steht das A zu weit vom P weg
const WM_KERN = { PA: -.085 };
wmText.innerHTML = [...wmText.textContent].map((c, i, a) => {
  const k = WM_KERN[(c + (a[i + 1] || "")).toUpperCase()];
  return `<span class="ch"${k ? ` style="margin-right:${k}em"` : ""}>${c === " " ? "&nbsp;" : c}</span>`;
}).join("");
const wmChars = $$(".ch", wmText);
// Impressum beginnt genau auf der Linie von Mail / Instagram / LinkedIn
function alignLegal() {
  const l = $(".footer__links"), g = $(".footer__legal"); if (!l || !g) return;
  const x = l.getBoundingClientRect().left - g.getBoundingClientRect().left - parseFloat(getComputedStyle(g).paddingLeft);
  g.style.setProperty("--legx", x > 20 ? x.toFixed(1) + "px" : "auto");   // Handy: Links stehen links → normal verteilen
  // Animation unten so hoch wie der große Name plus die Zeile darunter
  const nameH = wmText.getBoundingClientRect().height, legH = g.offsetHeight;
  if (nameH) document.documentElement.style.setProperty("--striph", Math.round(nameH + legH) + "px");
}
function fitWordmark() {
  wmText.style.fontSize = "100px";
  const w = wmText.scrollWidth;
  wmText.style.fontSize = (100 * (VW - 2 * PAD()) / w) + "px";   // links und rechts derselbe Rand wie alles andere
}
let wmHover = false;
wordmark.addEventListener("pointerenter", () => (wmHover = true));
wordmark.addEventListener("pointerleave", () => { wmHover = false; wmChars.forEach((c) => c.style.setProperty("--wy", 0)); });
wordmark.addEventListener("pointermove", (e) => {
  const r = wordmark.getBoundingClientRect();
  wordmark.style.setProperty("--tx", (e.clientX - r.left) + "px");
  wordmark.style.setProperty("--ty", (e.clientY - r.top) + "px");
});
function updateWordmark() {
  if (!wmHover) return;
  for (const c of wmChars) {
    const r = c.getBoundingClientRect();
    const d = (r.left + r.width / 2 - pointer.x) / (VW * .09);
    c.style.setProperty("--wy", (Math.exp(-d * d) * VW * .012).toFixed(2));
  }
}
wordmark.addEventListener("click", () => Player.open(wmText.getBoundingClientRect()));

/* =========================================================
   12. WIN98 · Player „Eine Nachricht aus der Vergangenheit.avi“ (spielt Kindervideo.mp4)
   ========================================================= */
const Player = (() => {
  const win = $("#player"), outline = $("#w98Outline"), task = $("#playerTask");
  const cv = $("#rpCanvas"), ctx = cv.getContext("2d");
  const video = $("#rpVideo");
  const ui = {
    play: $("#rpPlay"), stop: $("#rpStop"), prev: $("#rpPrev"), next: $("#rpNext"),
    seek: $("#rpSeek"), fill: $("#rpSeekFill"), thumb: $("#rpThumb"),
    status: $("#rpStatus"), kbps: $("#rpKbps"), time: $("#rpTime"), vol: $("#rpVol")
  };
  let state = "idle", stateT = 0, pos = { x: null, y: null }, isOpen = false, raf = 0, last = 0, rebuffered = false;
  // Lautstärke: schlichter, waagrechter Keil im Win98-Stil – klicken oder ziehen
  let vol = .6; video.volume = vol;
  const volFill = ui.vol.querySelector(".rp-vol__fill"), volThumb = ui.vol.querySelector(".rp-vol__thumb"), wedge = ui.vol.querySelector(".rp-vol__wedge");
  const setVol = (v) => { vol = clamp(v); video.volume = vol; video.muted = false; volFill.style.width = vol * 100 + "%"; volThumb.style.left = `calc(${wedge.offsetLeft}px + ${vol} * ${wedge.offsetWidth}px)`; ui.vol.setAttribute("aria-valuenow", Math.round(vol * 100)); };
  ui.vol.addEventListener("pointerdown", (e) => {
    ui.vol.setPointerCapture(e.pointerId);
    const at = (ev) => { const r = wedge.getBoundingClientRect(); setVol((ev.clientX - r.left) / r.width); };
    at(e);
    const up = () => { ui.vol.removeEventListener("pointermove", at); ui.vol.removeEventListener("pointerup", up); };
    ui.vol.addEventListener("pointermove", at); ui.vol.addEventListener("pointerup", up);
  });
  ui.vol.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") setVol(vol + .1); if (e.key === "ArrowLeft" || e.key === "ArrowDown") setVol(vol - .1); });

  function zoomRect(from, to, done) {
    const steps = 9; let i = 0;
    outline.style.display = "block";
    const tick = () => {
      const k = i / steps;
      outline.style.left = lerp(from.left, to.left, k) + "px";
      outline.style.top = lerp(from.top, to.top, k) + "px";
      outline.style.width = lerp(from.width, to.width, k) + "px";
      outline.style.height = lerp(from.height, to.height, k) + "px";
      if (i++ < steps) setTimeout(tick, 22); else { outline.style.display = "none"; done && done(); }
    };
    tick();
  }
  function winRect() {
    const w = win.offsetWidth || 486, h = win.offsetHeight || 420;
    if (pos.x === null) { pos.x = (VW - w) / 2; pos.y = Math.max(20, (VH - h) / 2); }
    pos.x = clamp(pos.x, -w + 60, VW - 60); pos.y = clamp(pos.y, 0, VH - 30);
    return { left: pos.x, top: pos.y, width: w, height: h };
  }
  const place = () => (win.style.transform = `translate(${pos.x}px, ${pos.y}px)`);
  const loopOn = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  function open(from) {
    if (isOpen && !win.hidden) { win.classList.remove("is-inactive"); return; }
    win.hidden = false; win.style.visibility = "hidden";
    const to = winRect(); place();
    win.hidden = true; win.style.visibility = "";
    task.hidden = true;
    zoomRect(from || to, to, () => {
      win.hidden = false; isOpen = true; loopOn(); setVol(vol); ui.play.focus({ preventScroll: true });
      if (state === "idle" || state === "stopped") { try { video.currentTime = 0; } catch (e) {} setState("playing"); }   // startet von selbst
    });
  }
  function close() {
    stop();
    const to = wmText.getBoundingClientRect(), from = winRect();
    win.hidden = true; task.hidden = true; isOpen = false;
    zoomRect(from, { left: to.left + to.width / 2 - 40, top: to.top + to.height / 2 - 20, width: 80, height: 40 });
  }
  function minimize() {
    const from = winRect(); win.hidden = true;
    task.hidden = false; const to = task.getBoundingClientRect(); task.hidden = true;
    zoomRect(from, to, () => (task.hidden = false));
  }
  task.addEventListener("click", () => {
    const from = task.getBoundingClientRect(); task.hidden = true;
    win.hidden = false; const to = winRect(); win.hidden = true;
    zoomRect(from, to, () => { win.hidden = false; loopOn(); });
  });
  $("#pClose").addEventListener("click", close);
  $("#pMin").addEventListener("click", minimize);
  addEventListener("keydown", (e) => {
    if (win.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === " " && document.activeElement?.closest("#player")) { e.preventDefault(); toggle(); }
  });
  document.addEventListener("pointerdown", (e) => win.classList.toggle("is-inactive", !win.contains(e.target)));

  const title = $("#playerTitle");
  title.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const sx = e.clientX - pos.x, sy = e.clientY - pos.y;
    title.setPointerCapture(e.pointerId);
    const mv = (ev) => { pos.x = ev.clientX - sx; pos.y = ev.clientY - sy; winRect(); place(); };
    const up = () => { title.removeEventListener("pointermove", mv); title.removeEventListener("pointerup", up); };
    title.addEventListener("pointermove", mv); title.addEventListener("pointerup", up);
  });

  function setState(s) {
    state = s; stateT = 0;
    win.classList.toggle("is-playing", s === "playing" || s === "connecting" || s === "buffering");
    if (s === "playing") video.play().catch(() => { video.muted = true; video.play().catch(() => {}); }); else video.pause();
  }
  function toggle() {
    if (state === "playing" || state === "buffering" || state === "connecting") setState("paused");
    else if (state === "paused") setState("playing");
    else { video.currentTime = 0; setState("playing"); }
  }
  function stop() { if (state === "idle") return; setState("stopped"); try { video.currentTime = 0; } catch (e) {} }
  ui.play.addEventListener("click", toggle);
  ui.stop.addEventListener("click", stop);
  ui.prev.addEventListener("click", () => { video.currentTime = 0; });
  ui.next.addEventListener("click", () => { video.currentTime = Math.min((video.duration || 9) - .05, video.currentTime + 3); });
  ui.seek.addEventListener("pointerdown", (e) => {
    const r = ui.seek.getBoundingClientRect();
    video.currentTime = clamp((e.clientX - r.left) / r.width) * (video.duration || 9);
    if (state === "idle" || state === "stopped") setState("playing");
  });
  video.addEventListener("ended", () => setState("stopped"));

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function splash(now) {
    const g = ctx.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, "#0b2a78"); g.addColorStop(1, "#000814");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 240);
    ctx.save(); ctx.translate(160, 98);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = `rgba(120,170,255,${((i + Math.floor(now / 90)) % 12) / 14})`;
      ctx.fillRect(34, -2, 10, 4);
    }
    ctx.restore();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2;
    ctx.save(); ctx.translate(147, 86); ctx.scale(.46, .46);
    ctx.stroke(new Path2D("M19.7 .5h19.2c10.6 0 19.3 8.6 19.3 19.2S49.5 39 38.9 39H19.7v12.8"));
    ctx.stroke(new Path2D("M.5 51.8V24.6h35.1a4.9 4.9 0 0 0 0-9.9H.5"));
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px Tahoma, Verdana"; ctx.textAlign = "center";
    ctx.fillText("Eine Nachricht aus der Vergangenheit.avi", 160, 172);
    ctx.fillStyle = "#9fb6e8"; ctx.font = "11px Tahoma, Verdana"; ctx.fillText(state === "stopped" ? "Gestoppt" : "Klicken Sie auf  ▶  Wiedergabe", 160, 216);
  }
  function msg(line1, pct) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "#c0c0c0"; ctx.font = "11px Tahoma, Verdana"; ctx.textAlign = "center";
    ctx.fillText(line1, 160, 112);
    if (pct != null) {
      ctx.strokeStyle = "#808080"; ctx.strokeRect(80.5, 124.5, 160, 10);
      ctx.fillStyle = "#000080";
      for (let i = 0; i < Math.floor(pct * 16); i++) ctx.fillRect(83 + i * 10, 127, 8, 6);
    }
  }
  function drawVideo() {
    if (video.readyState >= 2) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(video, 0, 0, 320, 240);
      ctx.fillStyle = "rgba(0,0,0,.12)";
      for (let y = 0; y < 240; y += 3) ctx.fillRect(0, y, 320, 1);
    } else { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 320, 240); }
  }
  function frame(now) {
    const dur = video.duration || 9, t = video.currentTime || 0;
    if (state === "connecting") {
      msg("Kontaktiere pascalpampel.de …");
      ui.status.textContent = "Verbindung wird hergestellt…";
      if (stateT > 1.1) setState("buffering");
    } else if (state === "buffering") {
      const p = clamp(stateT / (rebuffered && t > 1 ? .9 : 1.6));
      msg(rebuffered && t > 1 ? `Netzwerküberlastung – Puffern … ${Math.floor(p * 100)}%` : `Puffern … ${Math.floor(p * 100)}%`, p);
      ui.status.textContent = `Puffern: ${Math.floor(p * 100)}%`;
      if (p >= 1) setState("playing");
    } else if (state === "playing" || state === "paused") {
      drawVideo();
      if (state === "paused") { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, 320, 240); ctx.fillStyle = "#fff"; ctx.font = "bold 12px Tahoma"; ctx.textAlign = "center"; ctx.fillText("❚❚  Angehalten", 160, 124); }
      ui.status.textContent = state === "playing" ? "Wiedergabe: Netzwerk-Stream" : "Angehalten";
    } else {
      splash(now);
      ui.status.textContent = state === "stopped" ? "Gestoppt" : "Bereit";
    }
    const pct = clamp(t / dur);
    ui.fill.style.width = `calc(${pct * 100}% - ${pct * 4}px)`;
    ui.thumb.style.left = `${pct * 100}%`;
    ui.time.textContent = `${fmt(t)} / ${fmt(dur)}`;
    if (Math.random() < .05) ui.kbps.textContent = (state === "playing" ? (24 + Math.random() * 4.8) : 28.8).toFixed(1) + " Kbps";
  }
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    stateT += dt;
    if (!win.hidden) frame(now);
    raf = (isOpen && !win.hidden) || state === "playing" ? requestAnimationFrame(loop) : 0;
  }
  return { open, close };
})();


/* =========================================================
   12b. PROJEKT-OVERLAY (ohne Neuladen; Nav bleibt stehen)
   ========================================================= */
const pov = $("#pov"), povPanel = $("#povPanel"), povProject = $("#povProject");
const hexToRgb = (h) => { const n = parseInt(String(h).replace("#", ""), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
function md(text) {               // kleiner Markdown-Leser: Absätze, **fett**, *kursiv*, [Link](url)
  return String(text || "").trim().split(/\n\s*\n/).filter(Boolean).map((para) => {
    let x = esc(para).replace(/\n/g, "<br>");
    x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    x = x.replace(/\[([^\]]+)\]\((https?:[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return `<p>${x}</p>`;
  }).join("");
}
function mediaItem(m, i, P) {
  const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : "";
  const cls = `media__item${m.type === "video" ? " is-video" : ""}${m.src ? "" : " is-empty"}`;
  const st = `style="--i:${i + 2}"`;
  if (!m.src) return `<figure class="${cls}" ${st}>${cap || "<figcaption>Platzhalter</figcaption>"}</figure>`;
  if (m.type === "video") return `<figure class="${cls}" ${st}><video src="${esc(m.src)}" playsinline muted loop autoplay preload="metadata"></video>${cap}</figure>`;
  return `<figure class="${cls}" ${st}><img src="${esc(m.src)}" alt="${esc(m.caption || P.title)}" loading="${i ? "lazy" : "eager"}" />${cap}</figure>`;
}
// „Rechtliches" nutzt dasselbe Overlay wie die Projekte – nur mit schwarz-weißem Verlauf
const LEGAL = { slug: "rechtliches", title: "Rechtliches", palette: ["#0c0c0c", "#3a3a3a", "#d6d6d6", "#808080"] };
const LEGAL_HTML = `
  <div class="legal">
    <div class="project__bar" style="--i:0"><button type="button" class="back" data-back aria-label="Alle Arbeiten"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5" /></svg></button></div>
    <h1 class="project__title" style="--i:0">Rechtliches</h1>
    <section style="--i:1">
      <h2>Impressum</h2>
      <p>Angaben gemäß § 5 DDG</p>
      <p>Pascal Pampel<br>[Straße Hausnummer]<br>[PLZ] Nürnberg</p>
      <p>E-Mail: <a href="mailto:kontakt@pascalpampel.de">kontakt@pascalpampel.de</a></p>
      <p>Verantwortlich für den Inhalt: Pascal Pampel, Anschrift wie oben.</p>
    </section>
    <section style="--i:2">
      <h2>Datenschutz</h2>
      <h3>Verantwortlicher</h3>
      <p>Pascal Pampel, Kontakt wie im Impressum.</p>
      <h3>Hosting und Server-Logfiles</h3>
      <p>[Name des Hosters] speichert beim Aufruf der Seite technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite), um die Website auszuliefern und abzusichern.</p>
      <h3>Kontakt per E-Mail</h3>
      <p>Wenn du mir schreibst, verwende ich deine Angaben nur, um deine Anfrage zu beantworten.</p>
      <h3>Schriften und Skripte</h3>
      <p>[Hier eintragen, welche externen Dienste eingebunden sind, z. B. Schriftanbieter oder CDN.]</p>
      <h3>Deine Rechte</h3>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten sowie ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde.</p>
    </section>
  </div>`;
function fillProject(i) {
  if (i === -1) {
    povProject.innerHTML = LEGAL_HTML;
    POV.pal = LEGAL.palette.map(hexToRgb);
    document.title = "Rechtliches — Pascal Pampel";
    return;
  }
  const P = DATA[i]; if (!P) return;
  const media = P.media && P.media.length ? P.media : [{ type: "image", src: P.cover }];
  povProject.innerHTML = `
    <div class="split">
      <aside class="split__info">
        <div class="project__bar" style="--i:0"><button type="button" class="back" data-back aria-label="Alle Arbeiten"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5" /></svg></button><span class="project__year">${esc(P.year)}</span></div>
        <h1 class="project__title" style="--i:0">${umlTitle(P.title)}</h1>
        <div class="project__meta" style="--i:1">${(P.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <p class="project__lead" style="--i:2">${esc(P.short)}</p>
        <div class="project__text" style="--i:3">${md(P.text)}</div>
      </aside>
      <div class="split__media">${media.map((m, k) => mediaItem(m, k, P)).join("")}</div>
    </div>`;
  // Farben des Rahmens aus der Bildwelt (CMS-Palette, sonst Standard)
  POV.pal = (P.palette && P.palette.length >= 4 ? P.palette.slice(0, 4).map(hexToRgb) : PAL_HERO.map((x) => x.slice()));
  requestAnimationFrame(() => fitTitle(povProject.querySelector(".project__title")));
  document.title = `${P.title} — Pascal Pampel`;
}
function openProject(i, { push = true, replace = false } = {}) {
  const P = i === -1 ? LEGAL : DATA[i]; if (!P) return;
  if (!POV.gl) POV.gl = new FlowGL($("#povGL"), { palette: PAL_HERO.map((x) => x.slice()), scale: .5, zoom: 2.4, trackEl: pov });
  const swap = POV.open && POV.idx !== i;
  POV.idx = i;
  if (swap) {
    povPanel.classList.add("is-swapping");
    setTimeout(() => { fillProject(i); povPanel.scrollTop = 0; povPanel.classList.remove("is-swapping"); }, 260);
  } else fillProject(i);
  const url = location.pathname + "?p=" + encodeURIComponent(P.slug);
  if (replace) hist("replaceState", { pov: P.slug }, "", url);
  else if (push) hist("pushState", { pov: P.slug }, "", url);
  if (POV.open) return;
  POV.open = true;
  POV.returnY = scrollY;
  document.body.classList.add("pov-open");
  pov.setAttribute("aria-hidden", "false");
  if (lenis) lenis.stop(); else document.documentElement.style.overflow = "hidden";
  povPanel.scrollTop = 0;
  requestAnimationFrame(() => { pov.classList.add("is-open"); povPanel.focus({ preventScroll: true }); });
}
function closeProject({ fromHistory = false } = {}) {
  if (!POV.open) return;
  lbClose();
  if (!fromHistory && history.state && history.state.pov) { history.back(); return; }   // Zurück-Taste und Button verhalten sich gleich
  POV.open = false;
  pov.classList.remove("is-open");
  document.body.classList.remove("pov-open");
  pov.setAttribute("aria-hidden", "true");
  document.title = "Pascal Pampel — Gestaltung";
  if (!fromHistory) hist("replaceState", null, "", location.pathname);
  if (lenis) lenis.start(); else document.documentElement.style.overflow = "";
}
addEventListener("popstate", (e) => {
  const slug = e.state && e.state.pov;
  if (slug) { const i = slug === LEGAL.slug ? -1 : DATA.findIndex((p) => p.slug === slug); if (i >= -1 && (i >= 0 || slug === LEGAL.slug)) openProject(i, { push: false }); }
  else closeProject({ fromHistory: true });
});
povPanel.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) closeProject(); });   // auch für die Pfeile im Projektinhalt

/* Bilder & Videos im Projekt: anklicken → groß vor dem abgedunkelten, weiter animierten Hintergrund */
const LB = { open: false, items: [], i: 0, el: $("#povLB") };
function lbShow(i) {
  LB.i = (i + LB.items.length) % LB.items.length;
  const src = LB.items[LB.i];
  const fig = LB.el.querySelector(".pov__lb-fig");
  fig.classList.remove("is-in");
  fig.innerHTML = src.tagName === "VIDEO"
    ? `<video src="${src.currentSrc || src.src}" playsinline muted loop autoplay controls></video>`
    : `<img src="${src.currentSrc || src.src}" alt="${esc(src.alt || "")}" />`;
  requestAnimationFrame(() => requestAnimationFrame(() => fig.classList.add("is-in")));
}
function lbOpen(target) {
  LB.items = [...povProject.querySelectorAll(".split__media img, .split__media video")];
  const i = LB.items.indexOf(target); if (i < 0) return;
  LB.open = true; LB.el.hidden = false;
  pov.classList.add("lb-open");
  lbShow(i);
}
function lbClose() {
  if (!LB.open) return;
  LB.open = false; pov.classList.remove("lb-open");
  LB.el.querySelector(".pov__lb-fig").classList.remove("is-in");
  setTimeout(() => { if (!LB.open) { LB.el.hidden = true; LB.el.querySelector(".pov__lb-fig").innerHTML = ""; } }, 450);
}
povProject.addEventListener("click", (e) => { const m = e.target.closest(".split__media img, .split__media video"); if (m) lbOpen(m); });
LB.el.addEventListener("click", (e) => {
  if (e.target.closest("[data-lb-prev]")) return lbShow(LB.i - 1);
  if (e.target.closest("[data-lb-next]")) return lbShow(LB.i + 1);
  if (e.target.closest("video")) return;
  lbClose();
});
$("#legalOpen").addEventListener("click", () => openProject(-1));
addEventListener("keydown", (e) => {
  if (!POV.open) return;
  if (LB.open) {
    if (e.key === "Escape") lbClose();
    if (e.key === "ArrowRight") lbShow(LB.i + 1);
    if (e.key === "ArrowLeft") lbShow(LB.i - 1);
    return;
  }
  if (e.key === "Escape") closeProject();
  if (POV.idx < 0) return;
  if (e.key === "ArrowRight") openProject((POV.idx + 1) % DATA.length, { replace: true });
  if (e.key === "ArrowLeft") openProject((POV.idx - 1 + DATA.length) % DATA.length, { replace: true });
});
// Direkter Link (…?p=slug) öffnet das Projekt sofort über der Seite
(() => {
  const slug = new URLSearchParams(location.search).get("p");
  const i = !slug ? -2 : slug === LEGAL.slug ? -1 : DATA.findIndex((p) => p.slug === slug);
  if (i >= -1) {
    // erst die Seite selbst als Verlaufseintrag, darüber das Projekt → „Zurück" schließt nur das Overlay
    hist("replaceState", null, "", location.pathname);
    const go = () => setTimeout(() => {
      window.scrollTo(0, i === -1 ? document.documentElement.scrollHeight : docTop($("#arbeiten")));
      openProject(i, { push: true });
    }, 60);
    if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });   // Skript kann nach „load" kommen
  }
})();
function updatePov(dt) {
  POV.alpha = damp(POV.alpha, POV.open ? 1 : 0, 6, dt);
  if (!POV.gl || POV.alpha < .002) return;
  // Farben weich überblenden
  if (POV.pal) for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) POV.gl.pal[a][b] = damp(POV.gl.pal[a][b], POV.pal[a][b], 2.6, dt);
  const pd = paced("pov", dt, false); if (!pd) return;
  POV.t += pd;
  if (!window.__nogl) POV.gl.render(POV.t, pd);
}

/* =========================================================
   13. MAIN LOOP
   ========================================================= */
let simTime = 3.0, footTime = 9.0, lastT = performance.now();
const footHue = { v: 0 };

function onResize() {
  if (POV.open) requestAnimationFrame(() => fitTitle(povProject.querySelector(".project__title")));
  VW = innerWidth; VH = innerHeight; _pad = null;
  HERO_H = heroEl.offsetHeight; NAV_H = nav.offsetHeight;
  heroGL.resize(); footGL.resize(); if (POV.gl) POV.gl.resize();
  sizeSlots(); sizeCards(); fitWordmark(); alignLegal(); fitOrbitText(); cacheNav();
  chips.forEach((c) => (c.last = ""));
}
addEventListener("resize", onResize);

let frameNo = 0;
const perf = { acc: 0, n: 0, lowered: 0 };
function watchPerf(dt) {
  if (window.__noperf) return;
  perf.acc += dt; perf.n++;
  if (perf.n < 45) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (avg > 1 / 45 && perf.lowered < 3 && scrollY < HERO_H) {   // < 45 fps im Hero → Auflösung etwas senken
    perf.lowered++; heroGL.scale *= .85; heroGL.resize();
  }
}
function tick(now) {
  frameNo++;
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (lenis) lenis.raf(now);
  SCY = scrollY;
  updatePage();

  // Lesen vor dem Schreiben: Position des Footers abfragen, bevor die Kreise ihre Größe ändern (vermeidet erzwungenes Layout)
  const fr = footStrip.getBoundingClientRect();
  // Chips zuerst (setzt splitP für den Hero)
  updateChips(dt);

  if (scrollY < HERO_H + 10) {
    updateOrbit(dt);
    const hd = paced("hero", dt, performance.now() - (pointer.t || 0) < 700);
    if (hd) { simTime += hd; if (!window.__nogl && POV.alpha < .98) heroGL.render(simTime, hd); }
  }
  if (fr.top < VH && fr.bottom > 0) {
    const fd = paced("foot", dt, false);
    footTime += fd;
    const over = pointer.inside && pointer.x >= fr.left && pointer.x <= fr.right && pointer.y >= fr.top && pointer.y <= fr.bottom;
    if (over) footHue.v += dt * .22;                                     // nur beim Hovern: alle Farbtöne drehen mit, bleibt danach stehen                                     // ganz langsam durch den Farbkreis
    footGL.hue = footHue.v;
    if (fd && !window.__nogl && POV.alpha < .98) footGL.render(footTime, fd);
  }

  updateNav();
  updateWork(dt);
  updateSnap();
  updateGrain(dt);
  watchPerf(dt);
  updatePov(dt);
  requestAnimationFrame(tick);
}

function start() {
  initLenis();
  onResize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitOrbitText(); fitWordmark(); alignLegal(); cacheNav(); layoutDots(); });
  requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  requestAnimationFrame(tick);
}
if (document.readyState === "complete") start(); else addEventListener("load", start);

window.PP = { PROJECTS, SERVICES, Player };
})();
