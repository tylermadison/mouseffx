// GRAVITY WELL — GPGPU particle simulation in three.js.
// Position and velocity live in float textures (ping-pong). A fragment shader
// integrates gravity toward the cursor, a tangential swirl, curl noise, and
// cursor drag. Points render additively into a feedback buffer for trails.
import * as THREE from 'three';

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// #region doc:curl-noise
vec3 snoise3(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.416,-47.853,12.793)), snoise(p+vec3(-233.145,61.233,-7.41))); }
vec3 curl(vec3 p){
  const float e=0.05;
  vec3 dx=vec3(e,0,0), dy=vec3(0,e,0), dz=vec3(0,0,e);
  vec3 x0=snoise3(p-dx), x1=snoise3(p+dx);
  vec3 y0=snoise3(p-dy), y1=snoise3(p+dy);
  vec3 z0=snoise3(p-dz), z1=snoise3(p+dz);
  float x=(y1.z-y0.z)-(z1.y-z0.y);
  float y=(z1.x-z0.x)-(x1.z-x0.z);
  float z=(x1.y-x0.y)-(y1.x-y0.x);
  return normalize(vec3(x,y,z)+1e-6)*clamp(length(vec3(x,y,z))/(2.0*e),0.0,1.5);
}
// #endregion doc:curl-noise
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
`;

const QUAD_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const VEL_FS = NOISE + /* glsl */`
uniform sampler2D tPos, tVel;
uniform vec3 uMouse, uMouseVel;
uniform float uDt, uTime, uDown, uAspect;
varying vec2 vUv;
void main(){
  // #region doc:velocity-pass
  vec4 P = texture2D(tPos, vUv);
  vec4 V = texture2D(tVel, vUv);
  vec3 pos = P.xyz, vel = V.xyz;
  float h = hash12(vUv * 913.7);
  if (P.w > 1.0) {
    // freshly respawned: start with a gentle tangential drift
    vec3 d = uMouse - pos; vec3 n = normalize(d + 1e-5);
    vel = cross(n, vec3(0.0,0.0,1.0)) * (0.15 + 0.3*h);
    gl_FragColor = vec4(vel, V.w); return;
  }
  vec3 d = uMouse - pos;
  float r = length(d) + 1e-4;
  vec3 n = d / r;
  // Newtonian pull with softening, capped.
  vec3 grav = n * 0.28 / (r*r + 0.015);
  float gl = length(grav); if (gl > 14.0) grav *= 14.0 / gl;
  // Tangential swirl → orbits rather than a straight fall.
  vec3 tang = cross(n, vec3(0.0, 0.0, 1.0)) * (0.55 / (r + 0.12));
  // Turbulence
  vec3 c = curl(pos * 1.7 + vec3(0.0, 0.0, uTime * 0.12)) * (0.55 + 0.4*h);
  vel += (grav + tang + c) * uDt;
  // Cursor drag: fast cursor motion sweeps nearby particles along.
  vel += uMouseVel * exp(-r*r*10.0) * uDt * 2.5;
  // Hold the button: the well becomes a repulsor and the swarm explodes outward.
  vel -= n * uDown * 6.0 / (r*r*6.0 + 0.08) * uDt;
  vel *= exp(-uDt * 1.1);
  float sp = length(vel); if (sp > 2.6) vel *= 2.6 / sp;
  gl_FragColor = vec4(vel, V.w);
  // #endregion doc:velocity-pass
}`;

const POS_FS = NOISE + /* glsl */`
uniform sampler2D tPos, tVel;
uniform vec3 uMouse;
uniform float uDt, uTime, uAspect;
varying vec2 vUv;
void main(){
  // #region doc:position-respawn
  vec4 P = texture2D(tPos, vUv);
  vec3 vel = texture2D(tVel, vUv).xyz;
  float h = hash12(vUv * 517.3);
  float life = min(P.w, 1.0) - uDt * (0.06 + 0.12*h);
  vec3 pos = P.xyz + vel * uDt;
  bool out_ = abs(pos.x) > uAspect * 1.25 || abs(pos.y) > 1.25 || abs(pos.z) > 1.0;
  if (life <= 0.0 || out_) {
    float a = hash12(vUv * 77.7 + uTime) * 6.2831853;
    float r1 = hash12(vUv * 191.3 + uTime * 1.7);
    float r2 = hash12(vUv * 359.1 - uTime * 0.9);
    if (r2 < 0.55) {
      // respawn on a ring around the cursor
      float rad = 0.25 + 0.75 * r1;
      pos = uMouse + vec3(cos(a) * rad, sin(a) * rad, (hash12(vUv*7.0+uTime)-0.5)*0.3);
    } else {
      pos = vec3((r1 - 0.5) * 2.0 * uAspect, (hash12(vUv * 13.1 + uTime*2.3) - 0.5) * 2.0, (r2 - 0.5) * 0.4);
    }
    life = 1.5; // >1 flags "fresh" for the velocity pass
  }
  gl_FragColor = vec4(pos, life);
  // #endregion doc:position-respawn
}`;

const PT_VS = /* glsl */`
uniform sampler2D tPos, tVel;
uniform float uSize;
attribute vec2 ref;
varying float vSpeed, vLife;
void main(){
  // #region doc:point-sprite
  vec4 P = texture2D(tPos, ref);
  vec3 v = texture2D(tVel, ref).xyz;
  vSpeed = length(v); vLife = min(P.w, 1.0);
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.7 + 0.6 * smoothstep(0.0, 2.0, vSpeed)) * (0.6 + 0.4 * (P.z + 0.5));
  // #endregion doc:point-sprite
}`;

const PT_FS = /* glsl */`
varying float vSpeed, vLife;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = (1.0 - d) * (1.0 - d);
  float s = smoothstep(0.0, 2.4, vSpeed);
  vec3 deep = vec3(0.03, 0.10, 0.55), cyan = vec3(0.10, 0.94, 1.0), mag = vec3(1.0, 0.17, 0.84), white = vec3(1.0);
  vec3 col = mix(deep, cyan, smoothstep(0.0, 0.35, s));
  col = mix(col, mag, smoothstep(0.35, 0.75, s));
  col = mix(col, white, smoothstep(0.75, 1.0, s));
  float fade = smoothstep(0.0, 0.08, vLife) * smoothstep(1.0, 0.9, vLife);
  gl_FragColor = vec4(col * a * fade * 0.42, 1.0);
}`;

const FADE_FS = /* glsl */`
uniform sampler2D tPrev; uniform float uDecay;
varying vec2 vUv;
void main(){ vec3 c = texture2D(tPrev, vUv).rgb * uDecay; gl_FragColor = vec4(max(c - 0.0015, 0.0), 1.0); }`;

const COPY_FS = /* glsl */`
uniform sampler2D tSrc; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb;
  c = 1.0 - exp(-c * 1.45);                 // soft tonemap
  c = pow(c, vec3(0.9));
  gl_FragColor = vec4(c, 1.0);
}`;

const INIT_FS = /* glsl */`
uniform sampler2D tSrc; varying vec2 vUv;
void main(){ gl_FragColor = texture2D(tSrc, vUv); }`;

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer;
    const params = new URLSearchParams(location.search);
    const mobile = width < 800 && navigator.maxTouchPoints > 0;
    const N = parseInt(params.get('q')) || (mobile ? 256 : 512);
    this.N = N; this.count = N * N;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(dpr, 1.5));
    renderer.setSize(width, height);
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const floatOK = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const simType = floatOK ? THREE.FloatType : THREE.HalfFloatType;
    const rtOpts = { type: simType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
    this.pos = [new THREE.WebGLRenderTarget(N, N, rtOpts), new THREE.WebGLRenderTarget(N, N, rtOpts)];
    this.vel = [new THREE.WebGLRenderTarget(N, N, rtOpts), new THREE.WebGLRenderTarget(N, N, rtOpts)];
    this.ping = 0;

    // Fullscreen quad scene reused for every sim / post pass
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.Camera();
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(quadGeo, null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    const aspect = width / height;
    const shared = { uDt: { value: 0 }, uTime: { value: 0 }, uAspect: { value: aspect }, uMouse: { value: new THREE.Vector3() }, uMouseVel: { value: new THREE.Vector3() }, uDown: { value: 0 } };
    this.shared = shared;
    this.velMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: VEL_FS, uniforms: { tPos: { value: null }, tVel: { value: null }, ...shared }, depthTest: false, depthWrite: false });
    this.posMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: POS_FS, uniforms: { tPos: { value: null }, tVel: { value: null }, ...shared }, depthTest: false, depthWrite: false });
    this.fadeMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: FADE_FS, uniforms: { tPrev: { value: null }, uDecay: { value: 0.9 } }, depthTest: false, depthWrite: false });
    this.copyMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: COPY_FS, uniforms: { tSrc: { value: null } }, depthTest: false, depthWrite: false });
    this.initMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: INIT_FS, uniforms: { tSrc: { value: null } }, depthTest: false, depthWrite: false });

    // #region doc:seed
    // Seed positions
    const data = new Float32Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      data[i * 4 + 0] = (Math.random() - 0.5) * 2 * aspect;
      data[i * 4 + 1] = (Math.random() - 0.5) * 2;
      data[i * 4 + 2] = (Math.random() - 0.5) * 0.4;
      data[i * 4 + 3] = Math.random();
    }
    const seed = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
    seed.needsUpdate = true;
    this.initMat.uniforms.tSrc.value = seed;
    this.quad.material = this.initMat;
    for (const rt of this.pos) { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(this.quadScene, this.quadCam); }
    for (const rt of this.vel) { renderer.setRenderTarget(rt); renderer.clear(); }
    seed.dispose();
    // #endregion doc:seed

    // Points
    const geo = new THREE.BufferGeometry();
    const refs = new Float32Array(N * N * 2);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 2; refs[i] = (x + 0.5) / N; refs[i + 1] = (y + 0.5) / N; }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));
    this.ptMat = new THREE.ShaderMaterial({ vertexShader: PT_VS, fragmentShader: PT_FS, uniforms: { tPos: { value: null }, tVel: { value: null }, uSize: { value: 2.0 * Math.min(dpr, 1.5) * (N <= 256 ? 1.6 : 1) } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    this.points = new THREE.Points(geo, this.ptMat);
    this.points.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.points);
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 5;

    // Trail buffers
    this.makeTrails(width, height, Math.min(dpr, 1.5), floatOK);
    this.width = width; this.height = height;
    this.reduced = reduced;
  },

  makeTrails(w, h, pr, floatOK) {
    if (this.trail) this.trail.forEach((t) => t.dispose());
    const opts = { type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    const W = Math.floor(w * pr), H = Math.floor(h * pr);
    this.trail = [new THREE.WebGLRenderTarget(W, H, opts), new THREE.WebGLRenderTarget(W, H, opts)];
    this.tping = 0;
    this.floatOK = floatOK;
  },

  update(dt, t) {
    const { renderer, pointer: p, shared } = this;
    // #region doc:update-frame
    const aspect = this.width / this.height;
    const mx = (p.sx / this.width * 2 - 1) * aspect, my = -(p.sy / this.height * 2 - 1);
    shared.uMouse.value.set(mx, my, 0);
    shared.uMouseVel.value.set(p.vx / this.height * 2, -p.vy / this.height * 2, 0);
    shared.uDown.value += ((p.down ? 1 : 0) - shared.uDown.value) * Math.min(1, dt * 12);
    const sdt = Math.min(dt, 1 / 30) * (this.reduced ? 0.5 : 1);
    shared.uDt.value = sdt; shared.uTime.value = t;

    // 1) velocity
    const pi = this.ping, po = 1 - pi;
    this.velMat.uniforms.tPos.value = this.pos[pi].texture;
    this.velMat.uniforms.tVel.value = this.vel[pi].texture;
    this.quad.material = this.velMat;
    renderer.setRenderTarget(this.vel[po]); renderer.render(this.quadScene, this.quadCam);
    // 2) position
    this.posMat.uniforms.tPos.value = this.pos[pi].texture;
    this.posMat.uniforms.tVel.value = this.vel[po].texture;
    this.quad.material = this.posMat;
    renderer.setRenderTarget(this.pos[po]); renderer.render(this.quadScene, this.quadCam);
    this.ping = po;

    // 3) trails: fade previous, add points
    const ti = this.tping, to = 1 - ti;
    this.fadeMat.uniforms.tPrev.value = this.trail[ti].texture;
    this.fadeMat.uniforms.uDecay.value = Math.pow(0.885, dt * 60);
    this.quad.material = this.fadeMat;
    renderer.setRenderTarget(this.trail[to]); renderer.clear(); renderer.render(this.quadScene, this.quadCam);
    this.ptMat.uniforms.tPos.value = this.pos[po].texture;
    this.ptMat.uniforms.tVel.value = this.vel[po].texture;
    renderer.render(this.scene, this.camera);
    this.tping = to;

    // 4) to screen
    this.copyMat.uniforms.tSrc.value = this.trail[to].texture;
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(this.quadScene, this.quadCam);
    // #endregion doc:update-frame
  },

  resize(w, h, dpr) {
    this.width = w; this.height = h;
    const aspect = w / h;
    this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    this.renderer.setSize(w, h);
    this.camera.left = -aspect; this.camera.right = aspect; this.camera.updateProjectionMatrix();
    this.shared.uAspect.value = aspect;
    this.makeTrails(w, h, Math.min(dpr, 1.5), this.floatOK);
  },

  dispose() {
    this.pos.forEach((r) => r.dispose()); this.vel.forEach((r) => r.dispose()); this.trail.forEach((r) => r.dispose());
    [this.velMat, this.posMat, this.fadeMat, this.copyMat, this.initMat, this.ptMat].forEach((m) => m.dispose());
    this.points.geometry.dispose(); this.quad.geometry.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  },
};
