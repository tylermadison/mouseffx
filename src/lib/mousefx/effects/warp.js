// WARP DRIVE — hyperspace starfield in three.js.
// Each star is a line segment (head → tail) whose tail stretches with speed
// so streaks converge on the vanishing point. The cursor steers that point
// and acts as a lens that bends nearby streaks. Fast motion or holding the
// button engages warp. A short feedback trail adds glow.
import * as THREE from 'three';

const COMMON = /* glsl */`
uniform float uScroll, uStreak, uAspect, uLens, uWarp;
uniform vec2 uSteer, uMouse;
attribute float aEnd, aSeed;
varying float vAlpha, vSeed, vDepth;
const float D = 40.0;
vec2 project(vec3 p, float end){
  float z = mod(p.z + uScroll, D);
  float zz = z + end * uStreak * (0.3 + 0.7*z/D);
  vec2 xy = p.xy + uSteer * zz * 0.6;              // parallax steering
  vec2 ndc = xy / (zz * 0.35 + 0.15);
  ndc.x /= uAspect;
  // lens around the cursor
  vec2 dm = ndc - uMouse; vec2 dmA = dm * vec2(uAspect, 1.0);
  float r = length(dmA);
  float ang = uLens * exp(-r*r*2.5);
  float ca = cos(ang), sa = sin(ang);
  dm = mat2(ca,-sa,sa,ca) * dm;
  dm *= 1.0 - 0.35*exp(-r*r*3.0);
  vDepth = z / D;
  return uMouse + dm;
}`;

const LINE_VS = COMMON + /* glsl */`
void main(){
  vec2 ndc = project(position, aEnd);
  float z = vDepth;
  vAlpha = (1.0 - aEnd) * smoothstep(0.0, 0.06, z) * pow(1.0 - z, 1.2);
  vSeed = aSeed;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;
const POINT_VS = COMMON + /* glsl */`
void main(){
  vec2 ndc = project(position, 0.0);
  float z = vDepth;
  vAlpha = smoothstep(0.0, 0.06, z) * pow(1.0 - z, 1.5);
  vSeed = aSeed;
  gl_PointSize = (1.5 + 5.0 * pow(1.0 - z, 3.0)) * (1.0 + uWarp * 0.5);
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;
const COLOR = /* glsl */`
uniform float uWarp;
varying float vAlpha, vSeed, vDepth;
vec3 starColor(){
  vec3 c = vec3(0.85, 0.95, 1.0);
  if (vSeed > 0.86) c = vec3(1.0, 0.25, 0.85);
  else if (vSeed > 0.72) c = vec3(0.15, 0.95, 1.0);
  else if (vSeed > 0.66) c = vec3(0.35, 1.0, 0.4);
  c = mix(c, vec3(0.6, 0.85, 1.0), uWarp * 0.5);
  return c;
}`;
const LINE_FS = COLOR + `void main(){ gl_FragColor = vec4(starColor() * vAlpha * (0.3 + uWarp*0.5), 1.0); }`;
const POINT_FS = COLOR + `void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c,c)*4.0; if (d > 1.0) discard; float a = (1.0-d)*(1.0-d);
  gl_FragColor = vec4(starColor() * a * vAlpha * 0.9, 1.0); }`;

const QUAD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FADE_FS = `uniform sampler2D tPrev; uniform float uDecay; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tPrev, vUv).rgb * uDecay, 1.0); }`;
const COMP_FS = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uVanish; uniform float uWarp, uAspect, uTime; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb;
  vec2 d = (vUv - uVanish) * vec2(uAspect, 1.0); float r = length(d);
  // tunnel glow at the vanishing point, brighter in warp
  vec3 glow = mix(vec3(0.1, 0.3, 0.9), vec3(0.4, 0.9, 1.0), uWarp) * (0.05 + 0.35*uWarp) / (r*6.0 + 0.6);
  c += glow;
  // deep-space gradient
  c += vec3(0.02, 0.01, 0.05) * (1.0 - r);
  c = 1.0 - exp(-c * 1.4);
  gl_FragColor = vec4(c, 1.0);
}`;

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer; this.reduced = reduced;
    const N = width < 800 ? 5000 : 14000; this.N = N; this.count = N;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);       // 1 px GL lines → keep 1 CSS px
    renderer.setSize(width, height); renderer.autoClear = false;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const pos = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2), seed = new Float32Array(N * 2);
    const ppos = new Float32Array(N * 3), pseed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.pow(Math.random(), 0.7) * 3.2;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr, z = Math.random() * 40, s = Math.random();
      for (let k = 0; k < 2; k++) { const j = i * 2 + k; pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z; end[j] = k; seed[j] = s; }
      ppos[i * 3] = x; ppos[i * 3 + 1] = y; ppos[i * 3 + 2] = z; pseed[i] = s;
    }
    const u = { uScroll: { value: 0 }, uStreak: { value: 0.5 }, uAspect: { value: width / height }, uLens: { value: 0 }, uWarp: { value: 0 }, uSteer: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2() } };
    this.u = u;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1)); lg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(pseed, 1)); pg.setAttribute('aEnd', new THREE.BufferAttribute(new Float32Array(N), 1));
    const opts = { uniforms: u, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false };
    this.lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_VS, fragmentShader: LINE_FS, ...opts });
    this.pointMat = new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, ...opts });
    this.lines = new THREE.LineSegments(lg, this.lineMat); this.points = new THREE.Points(pg, this.pointMat);
    this.lines.frustumCulled = this.points.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.lines, this.points);
    this.cam = new THREE.Camera();

    this.quadScene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); this.quad.frustumCulled = false; this.quadScene.add(this.quad);
    this.fadeMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: FADE_FS, uniforms: { tPrev: { value: null }, uDecay: { value: 0.8 } }, depthTest: false, depthWrite: false });
    this.compMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: COMP_FS, uniforms: { tSrc: { value: null }, uVanish: { value: new THREE.Vector2(0.5, 0.5) }, uWarp: { value: 0 }, uAspect: { value: width / height }, uTime: { value: 0 } }, depthTest: false, depthWrite: false });
    this.width = width; this.height = height;
    this.makeTrails(width, height);
    this.warp = 0; this.steer = new THREE.Vector2();
  },

  makeTrails(w, h) {
    if (this.trail) this.trail.forEach((t) => t.dispose());
    const half = this.renderer.extensions.has('EXT_color_buffer_float') || this.renderer.extensions.has('EXT_color_buffer_half_float');
    const opts = { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.trail = [new THREE.WebGLRenderTarget(w, h, opts), new THREE.WebGLRenderTarget(w, h, opts)]; this.tp = 0;
  },

  update(dt, t) {
    const { renderer, u, pointer: p } = this;
    const w = this.width, h = this.height;
    // warp factor: quick attack, slow release
    const target = Math.max(0, (p.speed - 300) / 1600) + (p.down ? 1 : 0);
    const k = target > this.warp ? 4 : 1.4;
    this.warp += (Math.min(1, target) - this.warp) * Math.min(1, dt * k);
    const warp = this.warp;
    const speed = (this.reduced ? 2 : 5) + warp * 55;
    u.uScroll.value -= speed * dt;               // stars come toward the camera
    u.uStreak.value = 0.25 + warp * 6.0;
    u.uWarp.value = warp;
    // steering: smoothed offset toward cursor
    const tx = (p.sx / w * 2 - 1), ty = -(p.sy / h * 2 - 1);
    this.steer.x += (tx * 0.9 - this.steer.x) * Math.min(1, dt * 2.5);
    this.steer.y += (ty * 0.9 - this.steer.y) * Math.min(1, dt * 2.5);
    u.uSteer.value.copy(this.steer);
    u.uMouse.value.set(p.x / w * 2 - 1, -(p.y / h * 2 - 1));
    u.uLens.value += ((p.down ? 1.6 : 0.55) - u.uLens.value) * Math.min(1, dt * 4);

    // trail feedback
    const ti = this.tp, to = 1 - ti;
    this.fadeMat.uniforms.tPrev.value = this.trail[ti].texture;
    this.fadeMat.uniforms.uDecay.value = Math.pow(0.5 + warp * 0.2, dt * 60);
    this.quad.material = this.fadeMat;
    renderer.setRenderTarget(this.trail[to]); renderer.clear(); renderer.render(this.quadScene, this.cam);
    renderer.render(this.scene, this.cam);
    this.tp = to;
    // composite
    const cm = this.compMat.uniforms;
    cm.tSrc.value = this.trail[to].texture; cm.uWarp.value = warp; cm.uTime.value = t;
    // vanishing point in uv: where xy=0 projects → steer * zz*0.6 / (zz*0.35) → steer*1.71, then lens ignored
    cm.uVanish.value.set((this.steer.x * 1.71 / u.uAspect.value) * 0.5 + 0.5, this.steer.y * 1.71 * 0.5 + 0.5);
    this.quad.material = this.compMat;
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(this.quadScene, this.cam);
  },

  resize(w, h) {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h);
    this.u.uAspect.value = w / h; this.compMat.uniforms.uAspect.value = w / h;
    this.makeTrails(w, h);
  },

  dispose() {
    this.trail.forEach((t) => t.dispose());
    [this.lineMat, this.pointMat, this.fadeMat, this.compMat].forEach((m) => m.dispose());
    this.lines.geometry.dispose(); this.points.geometry.dispose(); this.quad.geometry.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  },
};
