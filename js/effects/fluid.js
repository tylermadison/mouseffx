// NEON FLUID — GPU stable-fluids solver (Jos Stam) in raw WebGL2.
// Passes per frame: curl → vorticity → divergence → pressure (Jacobi) →
// gradient subtract → advect velocity → advect dye → display.
// The cursor splats velocity + neon dye into the fields.

const VS = `precision highp float; attribute vec2 aPosition; varying vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;
void main(){ vUv = aPosition*0.5+0.5; vL = vUv-vec2(texelSize.x,0.); vR = vUv+vec2(texelSize.x,0.); vT = vUv+vec2(0.,texelSize.y); vB = vUv-vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }`;
const H = `precision highp float; precision highp sampler2D; varying vec2 vUv, vL, vR, vT, vB;`;
const FS = {
  clear: H + `uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value*texture2D(uTexture,vUv); }`,
  splat: H + `uniform sampler2D uTarget; uniform float aspectRatio, radius; uniform vec3 color; uniform vec2 point;
    void main(){ vec2 p = vUv-point; p.x*=aspectRatio; vec3 s = exp(-dot(p,p)/radius)*color; vec3 b = texture2D(uTarget,vUv).xyz; gl_FragColor = vec4(b+s,1.); }`,
  advect: H + `uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
    void main(){ vec2 c = vUv - dt*texture2D(uVelocity,vUv).xy*texelSize; vec4 r = texture2D(uSource,c); gl_FragColor = r/(1.0+dissipation*dt); }`,
  divergence: H + `uniform sampler2D uVelocity;
    void main(){ float L=texture2D(uVelocity,vL).x, R=texture2D(uVelocity,vR).x, T=texture2D(uVelocity,vT).y, B=texture2D(uVelocity,vB).y; vec2 C=texture2D(uVelocity,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; gl_FragColor = vec4(0.5*(R-L+T-B),0.,0.,1.); }`,
  curl: H + `uniform sampler2D uVelocity;
    void main(){ float L=texture2D(uVelocity,vL).y, R=texture2D(uVelocity,vR).y, T=texture2D(uVelocity,vT).x, B=texture2D(uVelocity,vB).x; gl_FragColor = vec4(0.5*(R-L-T+B),0.,0.,1.); }`,
  vorticity: H + `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main(){ float L=texture2D(uCurl,vL).x, R=texture2D(uCurl,vR).x, T=texture2D(uCurl,vT).x, B=texture2D(uCurl,vB).x, C=texture2D(uCurl,vUv).x;
      vec2 f = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+1e-4; f *= curl*C; f.y*=-1.;
      vec2 v = texture2D(uVelocity,vUv).xy + f*dt; gl_FragColor = vec4(clamp(v,-1000.,1000.),0.,1.); }`,
  pressure: H + `uniform sampler2D uPressure, uDivergence;
    void main(){ float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x, T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x; float d=texture2D(uDivergence,vUv).x;
      gl_FragColor = vec4((L+R+B+T-d)*0.25,0.,0.,1.); }`,
  gradient: H + `uniform sampler2D uPressure, uVelocity;
    void main(){ float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x, T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
      vec2 v = texture2D(uVelocity,vUv).xy - vec2(R-L,T-B); gl_FragColor = vec4(v,0.,1.); }`,
  display: H + `uniform sampler2D uTexture; uniform vec2 texelSize;
    void main(){ vec3 c = texture2D(uTexture,vUv).rgb;
      vec3 lc=texture2D(uTexture,vL).rgb, rc=texture2D(uTexture,vR).rgb, tc=texture2D(uTexture,vT).rgb, bc=texture2D(uTexture,vB).rgb;
      float dx = length(rc)-length(lc), dy = length(tc)-length(bc);
      vec3 n = normalize(vec3(dx,dy,length(texelSize)*2.0)); float diff = clamp(dot(n,vec3(0.,0.,1.))+0.7,0.7,1.0);
      c *= diff;
      c = 1.0 - exp(-c*1.8);                         // tonemap → neon saturation
      c += pow(max(c-0.6,0.0),vec3(2.0))*0.6;        // hot core bloom-ish
      // faint scanlines for the terminal feel
      float sl = 0.97 + 0.03*sin(gl_FragCoord.y*1.7);
      gl_FragColor = vec4(c*sl + vec3(0.02,0.02,0.03),1.); }`,
};

const PALETTE = [[0.1, 0.9, 1.0], [1.0, 0.15, 0.85], [0.25, 1.0, 0.35], [0.55, 0.25, 1.0], [1.0, 0.7, 0.1]];

export default {
  count: 0,
  init({ container, pointer, width, height, dpr }) {
    this.pointer = pointer;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 required');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float required');
    this.gl = gl; this.canvas = canvas;
    const mobile = width < 800 && navigator.maxTouchPoints > 0;
    this.cfg = { SIM: mobile ? 96 : 160, DYE: mobile ? 512 : 1024, ITERS: 20, CURL: 28, DYE_DISS: 0.9, VEL_DISS: 0.25, PRESSURE: 0.8, FORCE: 6000, RADIUS: 0.0022 };
    this.pr = Math.min(dpr, 1.5);
    this.setCanvasSize(width, height);

    // quad
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.buf = buf;

    this.prog = {};
    for (const k in FS) this.prog[k] = this.makeProgram(VS, FS[k]);
    this.initFBOs();
    this.lastX = pointer.x; this.lastY = pointer.y; this.hue = Math.random(); this.wasDown = false;
    // a few opening splats so the screen is not black
    for (let i = 0; i < 6; i++) this.splat(Math.random(), Math.random(), (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, this.color(i / 6, 1.2), 1.5);
  },

  setCanvasSize(w, h) {
    this.width = w; this.height = h;
    this.canvas.width = Math.floor(w * this.pr); this.canvas.height = Math.floor(h * this.pr);
  },

  makeProgram(vs, fs) {
    const gl = this.gl;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  },

  res(base) {
    const a = this.canvas.width / this.canvas.height;
    return a > 1 ? { w: Math.round(base * a), h: base } : { w: base, h: Math.round(base / a) };
  },

  fbo(w, h, internal, format, type, filter) {
    const gl = this.gl;
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  },
  dfbo(w, h, i, f, t, filter) {
    const a = this.fbo(w, h, i, f, t, filter), b = this.fbo(w, h, i, f, t, filter);
    return { read: a, write: b, w, h, tx: 1 / w, ty: 1 / h, swap() { const t = this.read; this.read = this.write; this.write = t; } };
  },

  initFBOs() {
    const gl = this.gl, s = this.res(this.cfg.SIM), d = this.res(this.cfg.DYE);
    const HF = gl.HALF_FLOAT;
    this.dye = this.dfbo(d.w, d.h, gl.RGBA16F, gl.RGBA, HF, gl.LINEAR);
    this.velocity = this.dfbo(s.w, s.h, gl.RG16F, gl.RG, HF, gl.LINEAR);
    this.divergence = this.fbo(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.curl = this.fbo(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.pressure = this.dfbo(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.count = s.w * s.h;
  },

  blit(target) {
    const gl = this.gl;
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  },

  use(name) { const pr = this.prog[name]; this.gl.useProgram(pr.p); return pr.u; },

  color(h, k = 1) {
    // blend between neighbouring palette entries → smooth neon hue drift
    const n = PALETTE.length, f = ((h % 1) + 1) % 1 * n, i = Math.floor(f), t = f - i;
    const a = PALETTE[i % n], b = PALETTE[(i + 1) % n];
    return [(a[0] + (b[0] - a[0]) * t) * k, (a[1] + (b[1] - a[1]) * t) * k, (a[2] + (b[2] - a[2]) * t) * k];
  },

  splat(x, y, dx, dy, color, rScale = 1) {
    const gl = this.gl, u = this.use('splat');
    const aspect = this.canvas.width / this.canvas.height;
    let r = this.cfg.RADIUS * rScale; if (aspect > 1) r *= aspect;
    gl.uniform1i(u.uTarget, this.velocity.read.attach(0));
    gl.uniform1f(u.aspectRatio, aspect); gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, r);
    this.blit(this.velocity.write); this.velocity.swap();
    gl.uniform1i(u.uTarget, this.dye.read.attach(0));
    gl.uniform3f(u.color, color[0], color[1], color[2]);
    this.blit(this.dye.write); this.dye.swap();
  },

  update(dt, t) {
    const gl = this.gl, p = this.pointer, c = this.cfg;
    const sdt = Math.min(dt, 1 / 40);
    gl.disable(gl.BLEND);

    // ---- input ----
    const dxp = p.x - this.lastX, dyp = p.y - this.lastY;
    this.lastX = p.x; this.lastY = p.y;
    const moved = Math.hypot(dxp, dyp);
    this.hue += dt * 0.05 + moved * 0.0004;
    if (moved > 0.5) {
      const nx = p.x / this.width, ny = 1 - p.y / this.height;
      const fx = dxp / this.width * c.FORCE, fy = -dyp / this.height * c.FORCE;
      const strength = Math.min(1, moved / 40);
      const col = this.color(this.hue, 0.18 + 0.5 * strength);
      // sub-steps along the stroke keep fast strokes continuous
      const steps = Math.min(4, Math.ceil(moved / 12));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        this.splat(nx - dxp / this.width * (1 - k), ny + dyp / this.height * (1 - k), fx, fy, col, p.down ? 2.2 : 1);
      }
    }
    if (p.down && !this.wasDown) {
      // burst: a ring of splats blasting outward
      const nx = p.x / this.width, ny = 1 - p.y / this.height;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; this.splat(nx, ny, Math.cos(a) * 2500, Math.sin(a) * 2500, this.color(this.hue + i / 14, 0.5), 1.6); }
    }
    this.wasDown = p.down;

    // ---- solve ----
    const V = this.velocity;
    let u = this.use('curl');
    gl.uniform2f(u.texelSize, V.tx, V.ty); gl.uniform1i(u.uVelocity, V.read.attach(0)); this.blit(this.curl);

    u = this.use('vorticity');
    gl.uniform2f(u.texelSize, V.tx, V.ty); gl.uniform1i(u.uVelocity, V.read.attach(0)); gl.uniform1i(u.uCurl, this.curl.attach(1));
    gl.uniform1f(u.curl, c.CURL); gl.uniform1f(u.dt, sdt); this.blit(V.write); V.swap();

    u = this.use('divergence');
    gl.uniform2f(u.texelSize, V.tx, V.ty); gl.uniform1i(u.uVelocity, V.read.attach(0)); this.blit(this.divergence);

    u = this.use('clear');
    gl.uniform1i(u.uTexture, this.pressure.read.attach(0)); gl.uniform1f(u.value, c.PRESSURE); this.blit(this.pressure.write); this.pressure.swap();

    u = this.use('pressure');
    gl.uniform2f(u.texelSize, V.tx, V.ty); gl.uniform1i(u.uDivergence, this.divergence.attach(0));
    for (let i = 0; i < c.ITERS; i++) { gl.uniform1i(u.uPressure, this.pressure.read.attach(1)); this.blit(this.pressure.write); this.pressure.swap(); }

    u = this.use('gradient');
    gl.uniform2f(u.texelSize, V.tx, V.ty); gl.uniform1i(u.uPressure, this.pressure.read.attach(0)); gl.uniform1i(u.uVelocity, V.read.attach(1)); this.blit(V.write); V.swap();

    u = this.use('advect');
    gl.uniform2f(u.texelSize, V.tx, V.ty);
    gl.uniform1i(u.uVelocity, V.read.attach(0)); gl.uniform1i(u.uSource, V.read.attach(0));
    gl.uniform1f(u.dt, sdt); gl.uniform1f(u.dissipation, c.VEL_DISS); this.blit(V.write); V.swap();
    gl.uniform1i(u.uVelocity, V.read.attach(0)); gl.uniform1i(u.uSource, this.dye.read.attach(1));
    gl.uniform1f(u.dissipation, c.DYE_DISS); this.blit(this.dye.write); this.dye.swap();

    // ---- display ----
    u = this.use('display');
    gl.uniform2f(u.texelSize, this.dye.tx, this.dye.ty); gl.uniform1i(u.uTexture, this.dye.read.attach(0)); this.blit(null);
  },

  resize(w, h, dpr) {
    this.pr = Math.min(dpr, 1.5);
    this.setCanvasSize(w, h);
    const gl = this.gl;
    for (const f of [this.dye, this.velocity, this.pressure]) { for (const k of ['read', 'write']) { gl.deleteTexture(f[k].tex); gl.deleteFramebuffer(f[k].fb); } }
    for (const f of [this.divergence, this.curl]) { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); }
    this.initFBOs();
  },

  dispose() {
    const gl = this.gl;
    for (const k in this.prog) gl.deleteProgram(this.prog[k].p);
    gl.deleteBuffer(this.buf);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.remove();
  },
};
