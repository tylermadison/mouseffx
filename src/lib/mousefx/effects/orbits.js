// N-BODY — the cursor is a star. Thousands of bodies orbit it under
// Newtonian gravity with softening. Trails come from a destination-out fade on
// a transparent canvas over a static starfield. Hold the button to go nova.

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer; this.reduced = reduced;
    this.stars = document.createElement('canvas');
    this.canvas = document.createElement('canvas');
    container.append(this.stars, this.canvas);
    this.sctx = this.stars.getContext('2d', { alpha: false });
    this.ctx = this.canvas.getContext('2d');
    this.pr = Math.min(dpr, 2);
    const mobile = width < 800;
    const N = mobile ? 1400 : 3200; this.N = N; this.count = N;
    this.x = new Float32Array(N); this.y = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N);
    this.width = width; this.height = height;
    for (let i = 0; i < N; i++) this.spawn(i, true);
    // colour LUT by speed
    this.lut = [];
    const stops = [[20, 40, 200], [25, 240, 255], [255, 43, 214], [255, 255, 255]];
    for (let i = 0; i < 64; i++) {
      const f = i / 63 * 3, k = Math.min(2, Math.floor(f)), tt = f - k;
      const a = stops[k], b = stops[k + 1];
      this.lut.push(`rgb(${a[0] + (b[0] - a[0]) * tt | 0},${a[1] + (b[1] - a[1]) * tt | 0},${a[2] + (b[2] - a[2]) * tt | 0})`);
    }
    this.wasDown = false; this.nova = 0;
    this.resize(width, height, dpr);
  },

  spawn(i, initial) {
    const w = this.width, h = this.height, p = this.pointer;
    if (initial) {
      // #region doc:seed-orbit
      // ring around the cursor with orbital velocity
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * Math.min(w, h) * 0.55;
      this.x[i] = p.sx + Math.cos(a) * r; this.y[i] = p.sy + Math.sin(a) * r;
      const v = Math.sqrt(this.GM / r) * (0.85 + Math.random() * 0.3);
      this.vx[i] = -Math.sin(a) * v; this.vy[i] = Math.cos(a) * v;
      // #endregion doc:seed-orbit
    } else {
      // #region doc:respawn-edge
      // enter from a random screen edge, drifting inward
      const side = (Math.random() * 4) | 0, s = Math.random();
      if (side === 0) { this.x[i] = -10; this.y[i] = s * h; } else if (side === 1) { this.x[i] = w + 10; this.y[i] = s * h; }
      else if (side === 2) { this.x[i] = s * w; this.y[i] = -10; } else { this.x[i] = s * w; this.y[i] = h + 10; }
      const dx = p.sx - this.x[i], dy = p.sy - this.y[i], d = Math.hypot(dx, dy) + 1;
      const v = 60 + Math.random() * 120, side_ = Math.random() < 0.5 ? 1 : -1;
      this.vx[i] = (dx / d) * v * 0.4 + (-dy / d) * v * side_; this.vy[i] = (dy / d) * v * 0.4 + (dx / d) * v * side_;
      // #endregion doc:respawn-edge
    }
  },

  get GM() { return 2.2e6; },

  resize(w, h, dpr) {
    this.width = w; this.height = h;
    for (const c of [this.stars, this.canvas]) { c.width = Math.floor(w * this.pr); c.height = Math.floor(h * this.pr); }
    this.ctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    this.sctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    const s = this.sctx;
    s.fillStyle = '#050508'; s.fillRect(0, 0, w, h);
    const g = s.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(60,20,90,0.35)'); g.addColorStop(0.5, 'rgba(10,20,60,0.25)'); g.addColorStop(1, 'rgba(5,5,8,0)');
    s.fillStyle = g; s.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const r = Math.random(); const size = r < 0.9 ? 0.8 : (r < 0.98 ? 1.4 : 2.2);
      s.globalAlpha = 0.25 + Math.random() * 0.7;
      s.fillStyle = Math.random() < 0.2 ? '#9fd8ff' : (Math.random() < 0.1 ? '#ffd2f5' : '#ffffff');
      s.fillRect(Math.random() * w, Math.random() * h, size, size);
    }
    s.globalAlpha = 1;
    this.ctx.clearRect(0, 0, w, h);
  },

  update(dt, t) {
    const { ctx, N, pointer: p } = this;
    const w = this.width, h = this.height;
    const sdt = Math.min(dt, 1 / 30) * (this.reduced ? 0.6 : 1);
    const GM = this.GM, soft = 900, sub = 2, hdt = sdt / sub;
    const sx = p.sx, sy = p.sy;
    const cx = w / 2, cy = h / 2;
    // #region doc:nova-state
    if (p.down && !this.wasDown) this.nova = 1;   // press edge → shockwave
    this.wasDown = p.down;
    const novaF = this.nova; this.nova = Math.max(0, this.nova - sdt * 1.6);
    const repel = p.down ? 1 : 0;
    // #endregion doc:nova-state
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    // #region doc:gravity-step
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < N; i++) {
        let dx = sx - x[i], dy = sy - y[i];
        const d2 = dx * dx + dy * dy + soft, d = Math.sqrt(d2);
        let a = GM / d2;
        // hold: the star flips to a repulsor; the press itself sends a shockwave
        if (repel) a = -a * 1.5;
        if (novaF > 0) a -= novaF * 3.5e7 / (d2 + 4000);
        vx[i] += dx / d * a * hdt; vy[i] += dy / d * a * hdt;
        // gentle pull to screen centre keeps the swarm on screen
        vx[i] += (cx - x[i]) * 0.05 * hdt; vy[i] += (cy - y[i]) * 0.05 * hdt;
        // speed cap
        const sp2 = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp2 > 1.44e6) { const k = 1200 / Math.sqrt(sp2); vx[i] *= k; vy[i] *= k; }
        x[i] += vx[i] * hdt; y[i] += vy[i] * hdt;
      }
    }
    // #endregion doc:gravity-step
    // #region doc:trail-fade
    // fade trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.82, sdt * 60)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    // #endregion doc:trail-fade
    // #region doc:speed-buckets
    // bodies, batched by colour bucket
    const lut = this.lut, buckets = this.buckets || (this.buckets = Array.from({ length: 64 }, () => []));
    for (let b = 0; b < 64; b++) buckets[b].length = 0;
    const margin = 200;
    for (let i = 0; i < N; i++) {
      if (x[i] < -margin || x[i] > w + margin || y[i] < -margin || y[i] > h + margin) { this.spawn(i, false); continue; }
      const sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      const b = Math.min(63, (sp / 620 * 63) | 0);
      buckets[b].push(i);
    }
    for (let b = 0; b < 64; b++) {
      const arr = buckets[b]; if (!arr.length) continue;
      ctx.fillStyle = lut[b];
      ctx.globalAlpha = 0.45 + b / 63 * 0.55;
      const sz = 1.2 + b / 63 * 1.6;
      for (let k = 0; k < arr.length; k++) { const i = arr[k]; ctx.fillRect(x[i] - sz / 2, y[i] - sz / 2, sz, sz); }
    }
    // #endregion doc:speed-buckets
    // the star
    ctx.globalAlpha = 1;
    const R = 70 + novaF * 260 + (p.down ? 30 : 0);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.08, p.down ? 'rgba(255,176,0,0.7)' : 'rgba(25,240,255,0.6)');
    g.addColorStop(0.35, 'rgba(255,43,214,0.12)'); g.addColorStop(1, 'rgba(255,43,214,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    if (novaF > 0) { // shock ring
      ctx.strokeStyle = `rgba(255,255,255,${novaF * 0.8})`; ctx.lineWidth = 2 + (1 - novaF) * 6;
      ctx.beginPath(); ctx.arc(sx, sy, (1 - novaF) * 520, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  dispose() { this.stars.remove(); this.canvas.remove(); },
};
