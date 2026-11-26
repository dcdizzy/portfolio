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
// Breite immer vom sichtbaren Bereich (clientWidth), nie innerWidth: am Handy kann innerWidth durch zu breiten Inhalt
// mitwachsen → alles wird nach dieser falschen Breite bemessen und die Seite lässt sich seitlich verschieben
const vpW = () => document.documentElement.clientWidth || innerWidth;
let VW = vpW(), VH = innerHeight, _pad = null;
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
uniform vec2 uDispPx;   // Größe einer Zelle der Maus-Simulation (in uv)
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
  // Maus-Verzerrung weich abtasten (9 Punkte): keine sichtbaren Kanten der groben Simulationszellen
  vec2 d = vec2(0.);
  if (uHasDisp > .5) {
    vec2 o = uDispPx * 1.25;
    d = texture2D(uDisp, uv).xy * 4.
      + (texture2D(uDisp, uv + vec2(o.x, 0.)).xy + texture2D(uDisp, uv - vec2(o.x, 0.)).xy
      +  texture2D(uDisp, uv + vec2(0., o.y)).xy + texture2D(uDisp, uv - vec2(0., o.y)).xy) * 2.
      +  texture2D(uDisp, uv + o).xy + texture2D(uDisp, uv - o).xy
      +  texture2D(uDisp, uv + vec2(o.x, -o.y)).xy + texture2D(uDisp, uv + vec2(-o.x, o.y)).xy;
    d /= 16.;
  }
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
    this.u = this.locs(this.main, ["uRes", "uTime", "uDisp", "uHasDisp", "uDispPx", "uC0", "uC1", "uC2", "uC3", "uZoom", "uRefH", "uHue"]);
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
    const sw = Math.max(16, Math.round(w / 6)), shh = Math.max(16, Math.round(h / 6));   // feinere Zellen
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
    // Auflösung: Grundwert × (Handy 1,9) × etwas mehr auf Retina-Bildschirmen – sonst sieht man dort an den feinen
    // Linien des Verlaufs Treppchen/Pixel. Gedeckelt, damit die Grafikkarte nicht überlastet.
    const q = clamp((devicePixelRatio || 1) * .75, 1, 1.5);
    const d = this.scale * (SMALL ? 1.9 : q);
    const w = Math.max(2, Math.round(this.c.clientWidth * d)), h = Math.max(2, Math.round(this.c.clientHeight * d));
    const changed = this.c.width !== w || this.c.height !== h;
    if (changed) { this.c.width = w; this.c.height = h; }
    this.sizeSim(this.c.clientWidth, this.c.clientHeight);
    // neue Canvas-Größe löscht das Bild → sofort neu zeichnen, sonst blitzt es beim Fenster-Ziehen schwarz
    if (changed && this._t != null) this.render(this._t, 0);
  }
  updateMouse(dt) {
    if (this.noMouse) { this.m.vx = this.m.vy = 0; this.m.px = null; return; }   // Projektseite: keine Reaktion auf die Maus
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
    this._t = time;
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
    if (this.sim) gl.uniform2f(u.uDispPx, 1 / this.sim.w, 1 / this.sim.h);
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
footGL.refH = () => Math.min(heroEl.clientHeight, VW * (window.__fr || .625));   // Musterdichte wie am Desktop-Footer (1440×900), auch auf schmalen Bildschirmen

/* Grain-Kachel einmal erzeugen und pro Bild zufällig verschieben */
(function makeGrain() {
  const g = document.createElement("canvas"); g.width = g.height = 160;
  const x = g.getContext("2d"), img = x.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty("--grain", `url(${g.toDataURL()})`);
})();
// Korn: läuft jetzt komplett per CSS-Animation (siehe .hero::after) – kein Eingriff pro Frame

/* =========================================================
   4. HERO · Laufschrift in Pillenform (Turbo) + Pille → Kreis
   ========================================================= */
const orbit = $("#orbit"), orbitSvg = $("#orbitSvg"), heroLogo = $("#heroLogo");
const tp = $("#orbitTP"), orbitText = $("#orbitText"), pillPath = $("#pillPath");
const heroScroll = $("#heroScroll"); heroScroll._a = "1.000";
heroScroll.addEventListener("click", (e) => { e.preventDefault(); scrollToY(docTop($("#leistungen"))); });
const PILL = { hw: 126, r: 84 };
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
  // nie größer als der Fließtext bei Leistungen (sichtbare Größe, die Grafik ist am Handy skaliert)
  const lb = $(".leistungen__body"), sc = (orbitText.getScreenCTM && orbitText.getScreenCTM()?.a) || 1;
  const cap = lb ? parseFloat(getComputedStyle(lb).fontSize) / sc : 22;
  orbitState.baseFs = clamp(13.5 * (L * .64) / len, 11, Math.min(22, cap));
  orbitState.baseLen = len * orbitState.baseFs / 13.5;
}
function setOrbitFont(fs) {
  const v = (Math.round(fs * 4) / 4).toFixed(2) + "px";   // in Viertelpixeln → seltener neues Text-Layout
  if (orbitText.style.fontSize !== v) orbitText.style.fontSize = v;
}

const turbo = { on: false, a: 0, k: 0, phase: .83, BASE: 34, MAX: 6000 };
orbit.addEventListener("pointerenter", () => (turbo.on = true));
orbit.addEventListener("pointerleave", () => (turbo.on = false));
orbit.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") turbo.on = true; });
addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") turbo.on = false; });

const sPill = new Spring(210, 15);   // Pille → Kreis (federnd, aber zügig)
let splitP = 0;                        // 0..1  Kreis teilt sich in 5
let ringM = 0;                         // 0..1  Schrift → Kontur
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const orbitRing = $("#orbitRing");

function updateOrbit(dt) {
  const H = HERO_H || (HERO_H = heroEl.offsetHeight);
  // Phase 1: Pille → Kreis
  const m1 = clamp(SCY / (H * .2));
  const s = sPill.step(easeIO(m1), dt);
  const sc = clamp(s);
  const over = s - sc;                                   // Über-/Unterschwinger → Wobble
  const r = PILL.r * (1 + over * .35 + (s < 0 ? s * .2 : 0));
  setPill(PILL.hw * (1 - sc) * (1 - Math.min(0, over) * 0), r);
  // Beim Weiterscrollen: Schrift beschleunigt, wird kleiner und wird zur Kontur (scroll-gesteuert, also auch rückwärts sauber)
  const m2 = clamp((SCY - H * .1) / (H * .17));
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
  // Laufschrift-Kreis verschwindet gleich zu Beginn des Teilens – danach gibt es nur noch die flüssige Form
  const fadeNow = 1 - smooth(0, .07, splitP);
  const textOn = textA > .004 && fadeNow > .004;          // unsichtbaren Text gar nicht erst neu setzen
  if (textOn) tp.setAttribute("startOffset", off.toFixed(1));
  // Logo bleibt beim Hover ruhig

  // Phase 2 beginnt: Text & Logo lösen sich auf
  const fade = fadeNow;
  orbitSvg.style.opacity = fade.toFixed(3);
  const vis = fade > .004 ? "" : "hidden";               // ganz ausgeblendet → aus dem Rendering nehmen
  if (orbitSvg.style.visibility !== vis) orbitSvg.style.visibility = vis;
  heroLogo.style.opacity = (1 - smooth(.05, .7, clamp(sc))).toFixed(3);
  // Scroll-Hinweis: verschwindet, sobald gescrollt wird
  const hintA = (1 - smooth(0, .06, SCY / Math.max(1, H))).toFixed(3);
  if (heroScroll._a !== hintA) { heroScroll._a = hintA; heroScroll.style.opacity = hintA; heroScroll.style.pointerEvents = +hintA < .3 ? "none" : ""; }   // Logo verschwindet früh
  orbit.style.pointerEvents = fade < .5 ? "none" : "";
}
// Geometrie-Cache: alles, was sich beim Scrollen nicht verändert, wird nur bei Größenänderungen gemessen
// (in Dokument-Koordinaten). Im Frame wird daraus nur noch gerechnet – kein Messen, kein erzwungenes Layout.
const GEO = { ok: false };
function cacheGeo() {
  const sy = scrollY;
  const dr = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top + sy, width: r.width, height: r.height }; };
  GEO.circles = circleSlots.map(dr); GEO.pills = pillSlots.map(dr);
  GEO.body = dr(leistBody); GEO.foot = dr(footStrip);
  GEO.navBottom = nav.getBoundingClientRect().bottom; GEO.brandBottom = navBrand.getBoundingClientRect().bottom;
  const o = orbit.getBoundingClientRect();
  GEO.orbit = { left: o.left, top: o.top + sy - orbitPush, width: o.width, height: o.height };
  GEO.ok = true;
}
const vr = (g) => ({ left: g.left, top: g.top - SCY, width: g.width, height: g.height, right: g.left + g.width, bottom: g.top - SCY + g.height });
function orbitRect() {
  const o = vr(GEO.orbit); o.top += orbitPush;
  const sc = o.width / 480, R = orbitState.r * sc;
  const cx = o.left + o.width / 2, cy = o.top + o.height / 2;
  return { left: cx - R, top: cy - R, width: 2 * R, height: 2 * R };
}

/* =========================================================
   5. SCROLLEN
   Desktop: Rad/Trackpad scrollen nativ; wenn die Bewegung steht, gleitet die Seite in den Abschnitt.
   Handy: Der Finger bewegt die Seite direkt (1:1). Beim Loslassen gibt es keinen langen nativen Schwung,
   der über mehrere Abschnitte schießt – die Seite gleitet höchstens einen Abschnitt weiter und
   übernimmt dabei die Geschwindigkeit des Fingers. In hohen Abschnitten läuft ein kurzer, weicher Schwung.
   ========================================================= */
// Verlauf sicher ändern (in eingebetteten Vorschauen kann das gesperrt sein)
const hist = (m, ...a) => { try { history[m](...a); } catch (e) {} };
const lockScroll = (on) => document.documentElement.classList.toggle("no-scroll", on);
const SNAP = { pts: [], free: [], from: 0, to: 0, t0: 0, dur: 0, m0: 0, on: false, timer: 0, rest: 0 };
const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - VH);
const easeGlide = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // easeInOutCubic
// mit Schwung: Hermite-Kurve (Startsteigung = Geschwindigkeit beim Loslassen, weich bis zum Stillstand)
const glideCurve = (u, m0) => m0 > 0 ? (u * u * u - 2 * u * u + u) * m0 + (3 * u * u - 2 * u * u * u) : easeGlide(u);
function glideTo(y, { minDur = 0, v0 = 0, dur = 0, m0min = 0 } = {}) {
  SNAP.from = scrollY; SNAP.to = clamp(Math.round(y), 0, maxScroll());
  const dist = SNAP.to - SNAP.from, d = Math.abs(dist);
  if (d < 1) { SNAP.on = false; SNAP.rest = SNAP.to; return; }
  // Dauer: Desktop ~0,8 s, Handy ~1 s für einen ganzen Bildschirm
  SNAP.dur = dur || Math.max(minDur, TOUCHUI ? 560 + 430 * Math.min(1.6, d / VH) : 480 + 330 * Math.min(1.6, d / VH));
  SNAP.m0 = clamp(Math.max(v0 * SNAP.dur / dist, m0min), 0, 2.2);
  SNAP.t0 = performance.now(); SNAP.on = true;
}
function stepScroll(now) {          // läuft am Anfang jedes Frames, vor dem Lesen von scrollY – genau ein Schreibzugriff pro Bild
  if (TOUCH.drag) { if (TOUCH.want !== TOUCH.wrote) { TOUCH.wrote = TOUCH.want; window.scrollTo(0, TOUCH.want); } return; }
  if (!SNAP.on) return;
  const t = Math.min(1, (now - SNAP.t0) / SNAP.dur);
  window.scrollTo(0, Math.round(SNAP.from + (SNAP.to - SNAP.from) * glideCurve(t, SNAP.m0)));
  if (t >= 1) { SNAP.on = false; SNAP.rest = SNAP.to; }
}
const stopGlide = () => { SNAP.on = false; };
const scrollToY = (y, { immediate = false } = {}) => {
  if (immediate) { stopGlide(); window.scrollTo(0, y); SNAP.rest = y; } else glideTo(y, { minDur: TOUCHUI ? 800 : 650 });
};
function snapPoints() {             // Abschnittsanfänge; Abschnitte höher als der Bildschirm sind innen frei scrollbar
  const max = maxScroll(), pts = [], free = [];
  for (const s of [$(".hero"), ...navSecs]) {
    const top = docTop(s), h = s.offsetHeight;
    if (s.id === "kontakt") { pts.push(max); continue; }
    pts.push(Math.min(top, max));
    if (h > VH + 4) { pts.push(Math.min(top + h - VH, max)); free.push([top, top + h - VH]); }
  }
  SNAP.pts = [...new Set(pts.map(Math.round))].sort((a, b) => a - b); SNAP.free = free;
}
const inFree = (y) => SNAP.free.find(([a, b]) => y > a + 2 && y < b - 2);
const nextPt = (y, dir) => dir > 0 ? SNAP.pts.find((p) => p > y + 1) : [...SNAP.pts].reverse().find((p) => p < y - 1);
const nearPt = (y) => SNAP.pts.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a, 0);
const scrollLocked = () => POV.open || document.documentElement.classList.contains("no-scroll");

/* ---------- Desktop: Rad / Trackpad / Tasten (nativ) ---------- */
function settle() {
  SNAP.timer = 0;
  if (TOUCH.drag || SNAP.on || scrollLocked() || !SNAP.pts.length) return;
  const y = scrollY;
  if (inFree(y)) { SNAP.rest = y; return; }
  const moved = y - SNAP.rest;
  let target = nearPt(y);
  // Richtung zählt: wer bewusst ein Stück weiterscrollt, kommt zum nächsten Abschnitt
  if (Math.abs(target - SNAP.rest) < 2 && Math.abs(moved) > Math.min(70, VH * .07)) {
    const n = nextPt(y, Math.sign(moved)); if (n !== undefined) target = n;
  }
  glideTo(target);
}
addEventListener("scroll", () => {
  if (SNAP.on || TOUCH.drag) return;   // eigenes Gleiten/Ziehen – abgebrochen wird nur durch echte Eingaben
  clearTimeout(SNAP.timer); SNAP.timer = setTimeout(settle, 80);
}, { passive: true });
addEventListener("pointerdown", (e) => { if (SNAP.on && e.pointerType === "mouse" && e.target === document.documentElement) stopGlide(); }, { passive: true });
let lastWheel = 0, lastWheelAbs = 0;
addEventListener("wheel", (e) => {
  const a = Math.abs(e.deltaY), now = performance.now();
  if (SNAP.on) {
    // auslaufender Trackpad-Schwung (kleiner werdende Werte) wird geschluckt, neuer Schub bricht das Gleiten ab
    if (a <= lastWheelAbs * 1.15 + 2 && now - lastWheel < 120) { if (!e.defaultPrevented) e.preventDefault(); }
    else stopGlide();
  }
  lastWheel = now; lastWheelAbs = a;
}, { passive: false });
addEventListener("keydown", (e) => { if (SNAP.on && /^(Arrow|Page|Home|End| )/.test(e.key)) stopGlide(); });

/* ---------- Handy: Finger ---------- */
const TOUCHUI = matchMedia("(pointer: coarse)").matches;
const TOUCH = { on: false, drag: false, axis: 0, x0: 0, y0: 0, s0: 0, want: 0, wrote: -1, track: false, hist: [] };
const SKIP_TOUCH = ".w98, .rp-vol, .pov, .lb, input, textarea, select";
if (TOUCHUI) {
  addEventListener("touchstart", (e) => {
    TOUCH.on = false; TOUCH.drag = false;
    if (e.touches.length !== 1 || scrollLocked() || e.target.closest(SKIP_TOUCH)) return;
    const t = e.touches[0];
    stopGlide(); clearTimeout(SNAP.timer);
    Object.assign(TOUCH, { on: true, axis: 0, x0: t.clientX, y0: t.clientY, s0: scrollY, want: scrollY, wrote: -1,
      track: !!e.target.closest("#trackWrap"), hist: [[performance.now(), scrollY]] });
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (!TOUCH.on) return;
    if (e.touches.length !== 1) { TOUCH.on = TOUCH.drag = false; return; }   // Zoomen mit zwei Fingern bleibt nativ
    const t = e.touches[0], dx = t.clientX - TOUCH.x0, dy = t.clientY - TOUCH.y0;
    if (!TOUCH.axis) {
      // Auf der Kartenreihe erst die Richtung abwarten (waagerecht = Karten wischen, nativ)
      if (TOUCH.track && Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
      TOUCH.axis = TOUCH.track && Math.abs(dx) > Math.abs(dy) ? 2 : 1;
      if (TOUCH.axis === 1) TOUCH.drag = true;
    }
    if (TOUCH.axis !== 1) return;
    if (e.cancelable) e.preventDefault();
    TOUCH.want = Math.round(clamp(TOUCH.s0 - dy, 0, maxScroll()));
    const now = performance.now(), H = TOUCH.hist; H.push([now, TOUCH.want]);
    while (H.length > 2 && now - H[0][0] > 90) H.shift();
  }, { passive: false });
  const release = () => {
    if (!TOUCH.on) return;
    const wasDrag = TOUCH.drag; TOUCH.on = TOUCH.drag = false;
    if (!wasDrag || scrollLocked() || !SNAP.pts.length) return;
    // Geschwindigkeit der letzten ~90 ms (px/ms, positiv = nach unten)
    const H = TOUCH.hist, now = performance.now(), [t0, y0] = H[0];
    let v = now - H[H.length - 1][0] > 70 ? 0 : (TOUCH.want - y0) / Math.max(16, now - t0);
    v = clamp(v, -4, 4);
    const y = TOUCH.want, zone = inFree(y);
    // im hohen Abschnitt: kurzer, natürlicher Schwung (bremst gleichmäßig ab)
    if (zone && Math.abs(v) > .08) {
      const proj = y + v * 300;
      if (proj > zone[0] && proj < zone[1]) { const d = Math.abs(proj - y); glideTo(proj, { v0: v, dur: clamp(2 * d / Math.abs(v), 250, 900) }); return; }
      const end = v > 0 ? zone[1] : zone[0]; glideTo(end, { v0: v }); return;
    }
    if (zone) { SNAP.rest = y; return; }
    // sonst: höchstens ein Abschnitt weiter – Richtung aus Schwung oder Strecke
    const moved = y - TOUCH.s0, dir = Math.abs(v) > .25 ? Math.sign(v) : Math.abs(moved) > Math.min(70, VH * .08) ? Math.sign(moved) : 0;
    let target = dir ? nextPt(y, dir) : nearPt(y);
    if (target === undefined) target = nearPt(y);
    const same = Math.sign(target - y) === Math.sign(v), dd = Math.abs(target - y);
    // schneller Wisch → kürzere Dauer, damit die Seite mit dem Finger-Tempo weiterläuft statt abzubremsen
    const dur = same && Math.abs(v) > .15 ? clamp(2 * dd / Math.abs(v), 320, 560 + 430 * Math.min(1.6, dd / VH)) : 0;
    glideTo(target, { v0: same ? v : 0, m0min: .6, dur });   // ohne zähen Anlauf
  };
  addEventListener("touchend", (e) => { if (!e.touches.length) release(); }, { passive: true });
  addEventListener("touchcancel", release, { passive: true });
}
const docTop = (el) => el.getBoundingClientRect().top + scrollY;

/* =========================================================
   6. NAV (ohne Hintergrund)
   ========================================================= */
const nav = $("#nav"), navBrand = $("#navBrand");
$("#navBrand").addEventListener("click", (e) => { e.preventDefault(); if (POV.open) { closeProject({ fromHistory: true }); hist("replaceState", null, "", location.pathname); } scrollToY(0); });
$$(".nav__links a, .nav__icons a").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  if (POV.open) { POV.open = true; closeProject({ fromHistory: true }); hist("replaceState", null, "", location.pathname); }
  const t = $(a.getAttribute("href"));
  const y = t.id === "kontakt" ? document.documentElement.scrollHeight - VH : docTop(t);
  scrollToY(y);
}));
const navSecs = ["leistungen", "arbeiten", "ueber", "kontakt"].map((id) => $("#" + id));
let navTops = [], navCut = -1;
const navLinks = $$(".nav__links a, .nav__icons a");
let WORK_TOP = 0, WORK_H = 0;
function cacheNav() {
  navTops = navSecs.map((s) => docTop(s)); snapPoints();
  if (typeof trackWrap !== "undefined") { WORK_TOP = docTop(trackWrap); WORK_H = trackWrap.offsetHeight; }
  HERO_H = heroEl.offsetHeight; NAV_H = nav.offsetHeight;
  cacheGeo();
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
// Textblock so hoch wie der längste Leistungstext – dann springt beim Wechsel nichts (der Abschnitt ist vertikal zentriert)
// Über mich (Desktop): Text so groß wie möglich (max. 19 px), aber immer ganz in der Fensterhöhe
function fitUeber() {
  const el = $(".ueber__body .ueber__cols"); if (!el) return;
  el.style.fontSize = "";
  if (VW <= 900) return;
  const need = () => { const k = el.children, a = k[0].getBoundingClientRect(), b = k[k.length - 1].getBoundingClientRect(); return b.bottom - a.top; };
  let fs = 19;
  while (fs > 12 && need() > el.clientHeight + 1) { fs -= .5; el.style.fontSize = fs + "px"; }
}
function sizeLeistBody() {
  const clone = leistBody.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
  clone.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;width:${leistBody.offsetWidth}px;min-height:0;margin:0`;
  leistBody.parentNode.appendChild(clone);
  const dE = clone.querySelector(".leistungen__desc"), lE = clone.querySelector(".leistungen__list");
  let mx = 0;
  for (const k in SERVICES) { dE.textContent = SERVICES[k].desc; lE.innerHTML = SERVICES[k].list.map((l) => `<li>${l}</li>`).join(""); mx = Math.max(mx, clone.offsetHeight); }
  clone.remove();
  leistBody.style.minHeight = Math.ceil(mx) + "px";
}
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
const chipsLayer = $("#chips");
/* Flüssige Kontur (Metaballs) auf der Grafikkarte – gleicher Look wie der frühere SVG-Filter, aber ohne Ruckeln */
const GooGL = (() => {
  const cv = document.createElement("canvas");
  cv.className = "goo-gl"; chipsLayer.insertBefore(cv, chipsLayer.firstChild);
  const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
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
  let shown = false, lastKey = "";
  return {
    draw(list, docY) {
      if (!list.length) { if (shown) { cv.style.display = "none"; shown = false; lastKey = ""; } return; }
      if (!shown) { cv.style.display = "block"; shown = true; }
      // Die Ebene liegt im Dokument und wird pro Bild an die Scrollposition geschoben (statt position: fixed):
      // so scrollt sie zwischen zwei Bildern zusammen mit Kreisen und Text – am Handy hinkt die Kontur nicht mehr hinterher
      const ty = Math.round(docY); if (cv._ty !== ty) { cv._ty = ty; cv.style.transform = `translate3d(0, ${ty}px, 0)`; }
      if (cv._h !== VH) { cv._h = VH; cv.style.height = VH + "px"; }
      // echte Größe der Ebene (ohne Scrollbalken) – sonst ist die Kontur gegenüber den Kreisen seitlich verschoben
      const dpr = Math.min(devicePixelRatio || 1, 2), cw = cv.clientWidth || chipsLayer.clientWidth, ch = VH;
      const w = Math.round(cw * dpr), h = Math.round(ch * dpr), sx = w / cw, sy = h / ch;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      for (let i = 0; i < 5; i++) {
        const b = list[i] || { x: -1e4, y: -1e4, r: 1, hw: 1, hh: 1, sx: 1, sy: 1 };
        C[i * 3] = b.x * sx; C[i * 3 + 1] = b.y * sy; C[i * 3 + 2] = b.r * dpr; B[i * 2] = (b.hw ?? b.r) * dpr; B[i * 2 + 1] = (b.hh ?? b.r) * dpr; S[i * 2] = b.sx; S[i * 2 + 1] = b.sy;
      }
      // nur neu zeichnen, wenn sich etwas bewegt hat; und nur im Rechteck um die Formen (spart am Handy viel Grafikleistung)
      const key = C.join() + B.join() + S.join() + list.length + w + h;
      if (key === lastKey) return; lastKey = key;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < Math.min(5, list.length); i++) {
        const ex = B[i * 2] * Math.max(1, S[i * 2]) + 40 * dpr, ey = B[i * 2 + 1] * Math.max(1, S[i * 2 + 1]) + 40 * dpr;
        x0 = Math.min(x0, C[i * 3] - ex); x1 = Math.max(x1, C[i * 3] + ex); y0 = Math.min(y0, C[i * 3 + 1] - ey); y1 = Math.max(y1, C[i * 3 + 1] + ey);
      }
      gl.viewport(0, 0, w, h);
      gl.uniform3fv(U.uC, C); gl.uniform2fv(U.uB, B); gl.uniform2fv(U.uS, S); gl.uniform1i(U.uN, Math.min(5, list.length));
      gl.uniform1f(U.uK, 20 * dpr); gl.uniform1f(U.uW, 1. * dpr); gl.uniform2f(U.uRes, w, h);
      gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const sx0 = clamp(Math.floor(x0), 0, w), sx1 = clamp(Math.ceil(x1), 0, w), sy0 = clamp(Math.floor(h - y1), 0, h), sy1 = clamp(Math.ceil(h - y0), 0, h);
      if (sx1 <= sx0 || sy1 <= sy0) return;
      gl.enable(gl.SCISSOR_TEST); gl.scissor(sx0, sy0, sx1 - sx0, sy1 - sy0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
})();
const circleSlots = $$("#slotCircles .slot"), pillSlots = $$("#slotPills .slot");
const filters = new Set();
const SVGNS = "http://www.w3.org/2000/svg";
// Bei jedem Laden andere Reihenfolge und Geschwindigkeiten für die Zellteilung
const SPLIT = (() => { const o = CATS.map((_, i) => i).sort(() => Math.random() - .5);
  return CATS.map((_, i) => ({ delay: o.indexOf(i) * .06 + Math.random() * .015, k: 300 + Math.random() * 140 })); })();
let splitArmed = true;
function reshuffleSplit() {
  // jedes Mal eine neue, deutlich sichtbare Reihenfolge: zufällige Abfolge mit gleichmäßigen Abständen
  const order = SPLIT.map((_, i) => i).sort(() => Math.random() - .5);
  SPLIT.forEach((s, i) => {
    s.delay = order.indexOf(i) * .06 + Math.random() * .015; s.k = 300 + Math.random() * 140;
    const sp = chips[i] && chips[i].s2;
    if (sp) { sp.k = s.k; sp.c = 2 * Math.sqrt(s.k); }   // kritisch gedämpft: kommt an, ohne nachzuwackeln
  });
}
const chips = CATS.map((cat, i) => {
  const el = document.createElement("button");
  el.type = "button"; el.className = "chip is-hidden"; el.dataset.cat = cat;   // unsichtbar, bis die Position berechnet ist
  el.innerHTML = `<span class="chip__fill"></span><span class="chip__label">${cat}</span>`;
  chipsLayer.appendChild(el);
  const c = { el, cat, i, label: el.lastElementChild, s2: new Spring(SPLIT[i].k, 2 * Math.sqrt(SPLIT[i].k)), s3: new Spring(380, 2 * Math.sqrt(380)), last: "" };
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
  if (!GEO.ok) cacheGeo();
  const c0 = vr(GEO.circles[0]);
  const circleDoc = c0.top + SCY + c0.height / 2;
  const p0 = vr(GEO.pills[0]);
  // alle Messungen vor dem ersten Schreibzugriff (sonst erzwingt jede Messung ein neues Layout)
  const As = GEO.circles.map(vr), Bs = GEO.pills.map(vr);
  const bodyTop = GEO.body.top - SCY;
  const pillDoc = p0.top + SCY + p0.height / 2;

  // Nav-Linie als „Schieber": Abstand Linie→Kreis ≥ halber Abstand Navtext→Linie
  const lineY = GEO.navBottom, pushY = lineY + Math.max(12, (lineY - GEO.brandBottom) * .6);
  // Phase 2: der Laufschrift-Kreis klebt an der Linie, wird geschoben und teilt sich in 5
  const Oraw = orbitRect(); Oraw.top -= orbitPush;
  const pushed1 = Math.max(0, pushY - Oraw.top);
  splitP = clamp(pushed1 / Math.max(140, VH * .23));
  // jedes Mal, wenn der Kreis wieder ganz zusammen ist: neue Reihenfolge und neue Tempi
  if (splitP === 0 && !splitArmed && chips.every((c) => c.s2.rest(0))) { reshuffleSplit(); splitArmed = true; }
  if (splitP > 0) splitArmed = false;
  if (Math.abs(pushed1 - orbitPush) > .1) { orbitPush = pushed1; orbit.style.transform = `translate(-50%, calc(-50% + ${pushed1.toFixed(1)}px))`; }
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
  const blobs = [];
  const SY = SCY;   // Kreise/Pillen werden in Dokument-Koordinaten gesetzt
  for (const c of chips) {
    // Reihenfolge: mittlerer Kreis zuerst, dann nach außen (wie eine Zellteilung)
    const t2 = clamp((splitP - SPLIT[c.i].delay) / .7);  // zufällige Verzögerung je Kreis
    const t3 = clamp((p3 - c.i * st3) / span3);          // linear – die Feder sorgt für das Auslaufen
    const e2 = c.s2.step(t2, dt), e3 = c.s3.step(t3, dt);
    const A = As[c.i], B = Bs[c.i];
    // geschobene Kreisposition: nie über der Linie
    const Ap = { left: A.left, top: Math.max(A.top, pushY), width: A.width, height: A.height };
    let R = lerpRect(O, e3 > 0 || pushed > 0 ? Ap : A, e2);
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
    const str = clamp(speed * .00009, 0, .18);
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
      c.el.classList.toggle("is-flying", flying && !!GooGL);   // ohne WebGL: normale Konturen statt weicher Form
      c.el.classList.toggle("is-pill", c.mode === "pill");
      c.el.classList.toggle("is-on", on);
      c.label.style.opacity = lab.toFixed(3);
      // Schriftgröße: in Ruhe echte Größe (scharf); in Bewegung feste Grundgröße + Skalierung auf der Grafikkarte –
      // sonst müsste die Schrift in jedem Bild neu gerendert werden (das hat beim Übergang Kreise → Pillen gehakt)
      const fs = Math.min(lerp(20, 18, e3), R.width / lerp(5.6, VW < 600 ? 5.1 : 6.6, clamp(e3)));   // Handy: Schrift in den Pillen größer
      if (settled) {
        const f = fs.toFixed(1);
        if (c._fs !== f) { c._fs = f; c.el.style.fontSize = f + "px"; }
        if (c._sc) { c._sc = 0; c.label.style.scale = ""; }
      } else {
        if (c._fs !== "20") { c._fs = "20"; c.el.style.fontSize = "20px"; }
        c._sc = 1; c.label.style.scale = (fs / 20).toFixed(3);
      }
    }
    if (flying && visible) {
      // Stauchung nur entlang der Hauptachsen nähern (reicht für die kleinen Werte)
      const ca = Math.abs(Math.cos(ang * Math.PI / 180)), sa = 1 - ca;
      blobs.push({ x: R.left + R.width / 2, y: R.top + R.height / 2, r: Math.min(R.width, R.height) / 2, hw: R.width / 2, hh: R.height / 2,
                   sx: lerp(sy, sx, ca), sy: lerp(sy, sx, sa) });
    }
  }
  if (GooGL) GooGL.draw(blobs, SY);
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
track.innerHTML = PROJECTS.map((p, i) => `
  <article class="card" data-tags="${p.tags.join(",")}">
    <div class="card__media">
      <img class="card__img" src="${IMG(p.img)}" alt="${p.title}" decoding="async" draggable="false" style="object-position:${p.pos}" />
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
cards.forEach((c, i) => c.addEventListener("click", () => openProject(i)));
const work = { wrote: -1, skew: 0, lastSL: 0, gap: 20, hInput: 0, snapTo: null };

function sizeCards() {
  // unten so viel Luft wie oben zwischen Fensterrand und Navtext
  const EDGE = Math.round($(".nav__brand").getBoundingClientRect().top) || 40;
  document.documentElement.style.setProperty("--edge", EDGE + "px");
  const above = trackWrap.getBoundingClientRect().top - secWork.getBoundingClientRect().top;   // Abschnitt beginnt oben am Bildschirm
  if (VW < 900) {                                    // Handy: Karten füllen den Screen, Text darunter
    track.style.setProperty("--ch", "auto");
    const icon = $(".nav__icons a"), ir = icon ? icon.getBoundingClientRect() : { top: 50 };
    const edge = Math.max(24, ir.top);                // Abstand Icons ↔ oberer Rand
    let cw = Math.round(Math.min(230, VW * .58));
    for (let pass = 0; pass < 2; pass++) {
      track.style.setProperty("--cw", cw + "px");
      const infoH = Math.max(...cards.map((c) => c.querySelector(".card__info").offsetHeight));
      const mediaH = VH - EDGE - above - infoH;
      cw = Math.round(clamp(mediaH * .8, 170, VW * .8));
    }
    track.style.setProperty("--cw", cw + "px");
    // nachmessen: die Karten samt Text müssen in den Screen passen (Text bricht bei schmaleren Karten länger um)
    for (let pass = 0; pass < 4; pass++) {
      const over = trackWrap.getBoundingClientRect().bottom - secWork.getBoundingClientRect().top - (VH - EDGE);
      if (over <= 0 || cw <= 150) break;
      cw = Math.max(150, Math.round(cw - over / 1.25 - 4));
      track.style.setProperty("--cw", cw + "px");
    }
  } else {
    const ch = clamp(VH - above - EDGE, 240, 615);
    track.style.setProperty("--ch", ch + "px");
    track.style.setProperty("--cw", Math.round(ch * 400 / 615) + "px");
  }
  requestAnimationFrame(() => cards.forEach((c) => fitTitle(c.querySelector(".card__title"))));
  work.gap = VW < 900 ? 18 : 20;
  track.style.gap = work.gap + "px";
  const cw = parseFloat(track.style.getPropertyValue("--cw")) || 400;
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
    trackWrap.scrollLeft = 0; work.snapTo = 0;
  }, leaving.length ? 170 : 0);
}

/* Reihe: Ziehen + Schwung, Pfeile */
const drag = { down: false, moved: false, sx: 0, sl: 0, v: 0, lx: 0, lt: 0, glide: 0 };
trackWrap.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0) return;
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
  if (!horiz) return;                                  // vertikal → Seite scrollt normal
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  e.preventDefault(); e.stopPropagation();           // Seite bekommt nichts vom horizontalen Wischen
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
/* Einrasten der Kartenreihe */
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
  if (Math.abs(drag.glide) > .1) { trackWrap.scrollLeft += drag.glide; drag.glide *= Math.pow(.9, dt * 60); }
  const max = trackWrap.scrollWidth - trackWrap.clientWidth;
  // Karten rasten ein: nach dem Wischen/Ziehen zur nächsten Karte gleiten
  if (!drag.down && !touchOnTrack && Math.abs(drag.glide) < 1.2 && performance.now() - work.hInput > 110) {
    const step = cardStep();
    if (work.snapTo === null) { const S = stops(); work.snapTo = S[Math.round(stopPos(trackWrap.scrollLeft, S))]; }
    const cur = trackWrap.scrollLeft, nx = damp(cur, work.snapTo, 11, dt);
    if (Math.abs(work.snapTo - cur) > .5) { drag.glide = 0; trackWrap.scrollLeft = Math.abs(work.snapTo - nx) < .5 ? work.snapTo : nx; work.wrote = trackWrap.scrollLeft; }
  }
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
// Impressum beginnt genau auf der Linie von Mail / Instagram / LinkedIn
// Lage im Layout, unabhängig von Animationen (transform) – sonst springt beim Laden etwas
const layoutLeft = (el) => { let x = 0; for (; el; el = el.offsetParent) x += el.offsetLeft; return x; };
function alignLegal() {
  const l = $(".footer__links"), g = $(".footer__legal"); if (!l || !g) return;
  // Desktop: Kontaktangaben (und die Zeile unter dem Namen) beginnen genau unter „Leistungen" in der Nav
  const nl = $(".nav__links a"), top = $(".footer__top");
  if (nl && top && getComputedStyle(nl.parentElement).display !== "none" && VW > 900) {
    const x = layoutLeft(nl) - layoutLeft(top) - parseFloat(getComputedStyle(top).paddingLeft);
    l.style.marginLeft = Math.max(0, x).toFixed(1) + "px";
  } else l.style.marginLeft = "";
  const x = layoutLeft(l) - layoutLeft(g) - parseFloat(getComputedStyle(g).paddingLeft);
  g.style.setProperty("--legx", x > 20 ? x.toFixed(1) + "px" : "auto");   // Handy: Links stehen links → normal verteilen
  // Animation unten so hoch wie oben der Abstand vom Fensterrand bis zur Nav-Linie
  const line = $(".nav__line");
  if (line) { let y = 0; for (let e = line; e; e = e.offsetParent) y += e.offsetTop; document.documentElement.style.setProperty("--striph", Math.round(y + line.offsetHeight) + "px"); }
}
function fitWordmark() {
  wmText.style.fontSize = "100px";
  const w = wmText.scrollWidth;
  wmText.style.fontSize = (100 * (VW - 2 * PAD()) / w) + "px";   // links und rechts derselbe Rand wie alles andere
}
wordmark.addEventListener("pointermove", (e) => {
  const r = wordmark.getBoundingClientRect();
  wordmark.style.setProperty("--tx", (e.clientX - r.left) + "px");
  wordmark.style.setProperty("--ty", (e.clientY - r.top) + "px");
});
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
      win.hidden = false; win.classList.remove("is-inactive"); isOpen = true; loopOn(); setVol(vol); ui.play.focus({ preventScroll: true });   // offen = aktives Fenster
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
const LEGAL = { slug: "rechtliches", title: "Rechtliches", palette: ["#0e0e0e", "#343434", "#9c9c9c", "#686868"] };
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
    $("#povHeadTitle").textContent = "Rechtliches";
    povHead.style.width = "";
    requestAnimationFrame(() => fitTitle(povProject.querySelector(".project__title")));
    povPanel.classList.remove("has-head");
    return;
  }
  const P = DATA[i]; if (!P) return;
  $("#povHeadTitle").innerHTML = umlTitle(P.title);
  povPanel.classList.remove("has-head");
  requestAnimationFrame(povHeadSize);
  const media = P.media && P.media.length ? P.media : [{ type: "image", src: P.cover }];
  povProject.innerHTML = `
    <div class="split">
      <aside class="split__info">
        <div class="project__top">
          <div class="project__bar" style="--i:0"><button type="button" class="back" data-back aria-label="Alle Arbeiten"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5" /></svg></button><span class="project__year">${esc(P.year)}</span></div>
          ${P.cover ? `<figure class="project__hero" style="--i:0"><img src="${esc(P.cover)}" alt="${esc(P.title)}" style="object-position:${esc(P.coverPosition || "50% 50%")}" /></figure>` : ""}
          <div class="project__intro">
            <h1 class="project__title" style="--i:0">${umlTitle(P.title)}</h1>
            <div class="project__meta" style="--i:1">${(P.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
            <p class="project__lead" style="--i:2">${esc(P.short)}</p>
          </div>
        </div>
        <div class="project__text" style="--i:3">${md(P.text)}</div>
      </aside>
      <div class="split__media${P.media && P.media.length ? "" : " is-cover-only"}">${media.map((m, k) => mediaItem(m, k, P)).join("")}</div>
    </div>`;
  // Farben des Rahmens aus der Bildwelt (CMS-Palette, sonst Standard)
  if (P.palette && P.palette.length >= 4) POV.pal = P.palette.slice(0, 4).map(hexToRgb);
  else {
    POV.pal = POV.pal || PAL_HERO.map((x) => x.slice());
    if (P.cover) coverPalette(P.cover).then((pal) => { if (pal && DATA[POV.idx] === P) POV.pal = pal; });
  }
  requestAnimationFrame(() => { fitTitle(povProject.querySelector(".project__title")); povHeadSize(); });
  if (document.fonts) document.fonts.ready.then(() => POV.open && povHeadSize());
  document.title = `${P.title} — Pascal Pampel`;
}
// Farben für den Hintergrund der Projektseite aus dem Titelbild: dunkle Grundfarbe, Mittelton, helle Fläche, kräftigster Akzent
const PAL_CACHE = new Map();
function coverPalette(src) {
  if (PAL_CACHE.has(src)) return PAL_CACHE.get(src);
  const p = new Promise((res) => {
    const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async";
    im.onload = () => {
      try {
        const N = 40, cv = document.createElement("canvas"); cv.width = cv.height = N;
        const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0, N, N);
        const d = cx.getImageData(0, 0, N, N).data, px = [];
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]);
        if (px.length < 20) return res(null);
        // k-means (5 Gruppen, wenige Durchläufe)
        let C = [0, .2, .4, .6, .8].map((f) => px[Math.floor(f * (px.length - 1))].slice());
        for (let it = 0; it < 8; it++) {
          const S = C.map(() => [0, 0, 0, 0]);
          for (const q of px) { let bi = 0, bd = 9; C.forEach((c, k) => { const dd = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = k; } }); const s = S[bi]; s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; s[3]++; }
          C = S.map((s, k) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3], s[3]] : C[k]);
        }
        const lum = (c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2], sat = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
        const G = C.filter((c) => (c[3] || 0) > px.length * .03).sort((a, b) => lum(a) - lum(b));
        if (G.length < 2) return res(null);
        const dark = G[0], light = G[G.length - 1], mid = G[Math.floor(G.length / 2)];
        const acc = [...G].sort((a, b) => sat(b) - sat(a))[0];
        // in den ruhigen Helligkeitsbereich des Hero bringen (nie grell, nie schwarz)
        const fit = (c, lo, hi) => { const L = Math.max(.001, lum(c)), t = clamp(L, lo, hi) / L; return [0, 1, 2].map((k) => clamp(c[k] * t, 0, .85)); };
        res([fit(dark, .06, .14), fit(mid, .14, .3), fit(light, .3, .45), fit(acc, .22, .4)]);
      } catch (e) { res(null); }
    };
    im.onerror = () => res(null);
    im.src = src;
  });
  PAL_CACHE.set(src, p); return p;
}
function openProject(i, { push = true, replace = false } = {}) {
  const P = i === -1 ? LEGAL : DATA[i]; if (!P) return;
  if (!POV.gl) { POV.gl = new FlowGL($("#povGL"), { palette: PAL_HERO.map((x) => x.slice()), scale: .62, zoom: 2.4, trackEl: pov }); POV.gl.noMouse = true; }
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
  lockScroll(true);
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
  lockScroll(false);
}
addEventListener("popstate", (e) => {
  const slug = e.state && e.state.pov;
  if (slug) { const i = slug === LEGAL.slug ? -1 : DATA.findIndex((p) => p.slug === slug); if (i >= -1 && (i >= 0 || slug === LEGAL.slug)) openProject(i, { push: false }); }
  else closeProject({ fromHistory: true });
});
povPanel.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) closeProject(); });
// Kopfzeile einblenden, sobald die Projekt-Überschrift oben aus dem Panel gescrollt ist
const povHeadUpd = () => {
  const t = povProject.querySelector(".project__title");
  const on = !!t && t.getBoundingClientRect().bottom < povPanel.getBoundingClientRect().top + 64;
  if (on !== povPanel.classList.contains("has-head")) povPanel.classList.toggle("has-head", on);
};
povPanel.addEventListener("scroll", povHeadUpd, { passive: true });
// Kopfzeile nur so breit wie die Textspalte – die Bilder rechts bleiben frei
const povHead = $(".pov__head");
function povHeadSize() {
  // erstes Bild = Fensterhöhe des Rahmens (oben und unten derselbe Innenabstand); Bildinhalt wird passend beschnitten
  const pt = parseFloat(getComputedStyle(povProject).paddingTop) || 0;
  povProject.style.setProperty("--firstH", Math.max(200, povPanel.clientHeight - 2 * pt) + "px");
  const info = povProject.querySelector(".split__info");
  const one = info && getComputedStyle(info.parentElement).gridTemplateColumns.split(" ").length < 2;
  // Textspalte scrollt mit, bis ihr Ende sichtbar ist – dann bleibt sie stehen, die Bilder laufen weiter
  // Handy: Titelbild so hoch, dass Pfeil, Bild, Titel, Tags und Kurzbeschreibung genau ins Fenster passen
  const hero = povProject.querySelector(".project__hero"), top = povProject.querySelector(".project__top");
  if (hero && top) {
    if (!one) hero.style.height = "";
    else {
      const other = top.offsetHeight - hero.offsetHeight;
      const avail = povPanel.clientHeight - pt - other - 20;
      hero.style.height = Math.round(clamp(avail, 140, hero.offsetWidth * 1.4)) + "px";
    }
  }
  if (info) {
    if (one) info.style.top = "";
    else {
      const pr = povPanel.getBoundingClientRect(), ir = info.getBoundingClientRect();
      const natural = ir.top - pr.top + povPanel.scrollTop;
      info.style.top = Math.round(Math.min(natural, povPanel.clientHeight - info.offsetHeight - 16)) + "px";
    }
  }
  povHead.style.width = info && !one ? Math.round(info.getBoundingClientRect().right - povPanel.getBoundingClientRect().left + parseFloat(getComputedStyle(povHead).paddingLeft) * .5) + "px" : "";
}
addEventListener("resize", () => { if (POV.open) povHeadSize(); });   // auch für die Pfeile im Projektinhalt

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
let simTime = 3.0, footTime = 9.0, lastT = performance.now(), scrollT = 0, lastSCY = -1;
const footHue = { v: 0 };

function onResize() {
  if (POV.open) requestAnimationFrame(() => fitTitle(povProject.querySelector(".project__title")));
  VW = vpW(); VH = innerHeight; _pad = null;
  document.documentElement.style.setProperty("--vh", VH + "px");   // sichtbare Fensterhöhe (Handy: mit/ohne Browserleiste)
  HERO_H = heroEl.offsetHeight; NAV_H = nav.offsetHeight;
  heroGL.resize(); footGL.resize(); if (POV.gl) POV.gl.resize();
  sizeSlots(); sizeCards(); fitWordmark(); alignLegal(); fitOrbitText(); sizeLeistBody(); fitUeber(); cacheNav(); cacheGeo();
  chips.forEach((c) => (c.last = ""));
}
addEventListener("resize", onResize);

let frameNo = 0;
const perf = { acc: 0, n: 0, slow: 0, base: 0 };
// Auflösung nur dann senken, wenn es wirklich dauerhaft ruckelt – und wieder anheben, sobald es flüssig läuft.
// (Vorher: kurze Laderuckler am Anfang haben die Auflösung dauerhaft gedrückt → Hintergrund pixelig.)
function watchPerf(dt) {
  if (window.__noperf || document.hidden) return;
  if (performance.now() < 4000) return;                        // Ladephase ignorieren
  perf.acc += dt; perf.n++;
  if (perf.n < 60) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (SCY >= HERO_H) { perf.slow = 0; return; }
  const base = perf.base || (perf.base = heroGL.scale);
  if (avg > 1 / 35) {                                          // nur bei deutlichem, anhaltendem Ruckeln (3 Messfenster) – und nur leicht
    if (++perf.slow >= 3 && heroGL.scale > base * .88 + .001) { heroGL.scale = Math.max(base * .88, heroGL.scale * .94); heroGL.resize(); perf.slow = 0; }
  } else {
    perf.slow = 0;
    if (avg < 1 / 55 && heroGL.scale < base - .001) { heroGL.scale = Math.min(base, heroGL.scale / .9); heroGL.resize(); }
  }
}
function tick(now) {
  frameNo++;
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  stepScroll(now);
  SCY = scrollY;
  if (Math.abs(SCY - lastSCY) > .5) { scrollT = performance.now(); lastSCY = SCY; }

  // Lesen vor dem Schreiben: Position des Footers abfragen, bevor die Kreise ihre Größe ändern (vermeidet erzwungenes Layout)
  if (!GEO.ok) cacheGeo();
  const fr = vr(GEO.foot);
  // Chips zuerst (setzt splitP für den Hero)
  updateChips(dt);

  if (scrollY < HERO_H + 10) {
    updateOrbit(dt);
    const hd = paced("hero", dt, true);   // Hero immer mit voller Bildrate – fließt gleichmäßig
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
  watchPerf(dt);
  updatePov(dt);
  requestAnimationFrame(tick);
}

function start() {
  onResize(); SNAP.rest = scrollY;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitOrbitText(); fitWordmark(); alignLegal(); cacheNav(); });
  requestAnimationFrame(tick);
  // erst einblenden, wenn Schrift geladen und der Hintergrund schon gezeichnet ist – dann startet auch das Intro
  let shown = false;
  const reveal = () => { if (shown) return; shown = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.add("is-ready"); document.body.classList.add("is-loaded");
    }));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { onResize(); reveal(); });   // mit echter Schrift alles einmal neu ausrichten, dann einblenden
  setTimeout(reveal, 900);   // spätestens dann, falls eine Schrift hängt
  // Kartenbilder schon vorab im Leerlauf dekodieren – sonst passiert das genau beim ersten Scrollen zu „Arbeiten"
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  idle(() => $$(".card__img").forEach((im) => im.decode && im.decode().catch(() => {})), { timeout: 2500 });
}
if (document.readyState === "complete") start(); else addEventListener("load", start);
// nach der Einflug-Animation der Nav (Positionen sind dann endgültig) noch einmal ausrichten
setTimeout(() => alignLegal(), 1900);

window.PP = { PROJECTS, SERVICES, Player };
})();
