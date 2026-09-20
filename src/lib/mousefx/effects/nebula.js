// NEBULA — a fullscreen fragment shader in three.js.
// Domain-warped fbm gas, two star layers, and a cursor that both lights the
// gas and bends space (lens + swirl). Renders at reduced resolution.
import * as THREE from 'three';

const FS = /* glsl */`
precision highp float;
uniform vec2 uRes, uMouse, uMouseVel;
uniform float uTime, uDown;
varying vec2 vUv;
// #region doc:noise-fbm
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; mat2 m = mat2(0.8,0.6,-0.6,0.8);
  for(int i=0;i<5;i++){ v += a*vnoise(p); p = m*p*2.03 + 7.3; a *= 0.5; } return v; }
// #endregion doc:noise-fbm
// #region doc:star-layer
vec3 stars(vec2 uv, float scale, float t, float bright){
  vec2 g = uv*scale; vec2 id = floor(g), f = fract(g)-0.5;
  float h = hash21(id);
  if (h > 0.06) return vec3(0.0);
  vec2 off = vec2(hash21(id+1.3), hash21(id+2.7))-0.5;
  float d = length(f-off*0.8);
  float tw = 0.6 + 0.4*sin(t*(1.0+h*40.0) + h*100.0);
  float s = smoothstep(0.08, 0.0, d) * tw * bright;
  vec3 col = mix(vec3(0.7,0.85,1.0), vec3(1.0,0.8,0.95), hash21(id+9.1));
  return col * s + col * 0.02/(d+0.02) * s;
}
// #endregion doc:star-layer
void main(){
  // #region doc:lens
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;
  vec2 m  = (uMouse - 0.5*uRes)/uRes.y;
  vec2 d = uv - m; float r = length(d);
  // lensing: pull space toward the cursor and swirl it
  float pull = 0.018/(r+0.05);
  float ang = (0.7 + uDown*2.5) * exp(-r*r*5.0);
  float ca = cos(ang), sa = sin(ang);
  vec2 dr = mat2(ca,-sa,sa,ca) * d * (1.0 - pull);
  vec2 q = m + dr;
  q += uMouseVel * 0.25 * exp(-r*r*6.0);           // motion smear
  // #endregion doc:lens
  // #region doc:domain-warp
  // domain-warped gas
  vec2 p = q*1.5;
  vec2 w1 = vec2(fbm(p + vec2(0.0, uTime*0.05)), fbm(p + vec2(5.2,1.3) - uTime*0.04));
  vec2 w2 = vec2(fbm(p + 3.0*w1 + vec2(1.7,9.2) + uTime*0.03), fbm(p + 3.0*w1 + vec2(8.3,2.8) - uTime*0.02));
  float f = fbm(p + 2.6*w2);
  float dens = smoothstep(0.25, 0.85, f);
  vec3 col = vec3(0.02, 0.01, 0.05);
  col = mix(col, vec3(0.06,0.20,0.75), dens*0.9);
  col = mix(col, vec3(0.85,0.12,0.75), clamp(w1.x*w1.y*2.2,0.0,1.0)*dens);
  col = mix(col, vec3(0.10,0.95,1.0), clamp(w2.y-0.45,0.0,1.0)*2.0*dens);
  col = mix(col, vec3(0.30,1.0,0.35), clamp(w2.x-0.55,0.0,1.0)*1.5*dens*dens);
  col *= 0.35 + 1.4*dens;
  // #endregion doc:domain-warp
  // #region doc:light-tonemap
  // cursor light scattering through the gas
  float light = 0.22/(r*r*28.0 + 0.25);
  col += vec3(0.55,0.9,1.0) * light * (0.3 + 1.8*dens);
  col += mix(vec3(0.4,0.9,1.0), vec3(1.0,0.75,0.3), uDown) * 0.0035/(r*r+0.0015);
  // stars: far layer (lensed) + near layer (lensed harder)
  col += stars(q, 24.0, uTime, 0.9);
  col += stars(q*1.7 + 3.1, 40.0, uTime*1.3, 0.5) * (0.5 + dens);
  // vignette + tonemap
  float vig = 1.0 - 0.45*dot(uv*0.9, uv*0.9);
  col *= vig;
  col = 1.0 - exp(-col*1.3);
  // #endregion doc:light-tonemap
  gl_FragColor = vec4(col, 1.0);
}`;
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export default {
  count: 0,
  init({ container, pointer, width, height, dpr }) {
    this.pointer = pointer;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.cam = new THREE.Camera();
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: {
      uRes: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2() }, uMouseVel: { value: new THREE.Vector2() },
      uTime: { value: 0 }, uDown: { value: 0 } }, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); quad.frustumCulled = false;
    this.scene.add(quad); this.quad = quad;
    this.resize(width, height, dpr);
  },
  // #region doc:resize-update
  resize(w, h, dpr) {
    this.width = w; this.height = h;
    // cap the internal resolution: fbm is per-pixel expensive, the image is soft anyway
    const pr = Math.min(dpr, 1100 / w, 1);
    this.pr = pr;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h);
    this.mat.uniforms.uRes.value.set(Math.floor(w * pr), Math.floor(h * pr));
    this.count = Math.floor(w * pr) * Math.floor(h * pr);
  },
  update(dt, t) {
    const p = this.pointer, u = this.mat.uniforms, pr = this.pr;
    u.uMouse.value.set(p.sx * pr, (this.height - p.sy) * pr);
    u.uMouseVel.value.set(p.vx / this.height, -p.vy / this.height);
    u.uDown.value += ((p.down ? 1 : 0) - u.uDown.value) * Math.min(1, dt * 6);
    u.uTime.value = t;
    this.renderer.render(this.scene, this.cam);
  },
  // #endregion doc:resize-update
  dispose() { this.mat.dispose(); this.quad.geometry.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); },
};
