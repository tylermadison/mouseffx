// TENDRILS — verlet rope chains anchored to the cursor, canvas 2D.
// Each rope is a chain of distance constraints. Gravity, a per-rope wind and
// the cursor's own motion whip them around. Fast tips shed sparks. Hold the
// button to electrify: gravity cuts out and the ropes crackle white.

const COLORS = [[25, 240, 255], [255, 43, 214], [57, 255, 20], [150, 80, 255], [255, 176, 0], [0, 255, 200]];

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer; this.reduced = reduced;
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.pr = Math.min(dpr, 2);
    const mobile = width < 800;
    this.R = mobile ? 9 : 16; this.S = mobile ? 26 : 38;
    this.ropes = [];
    for (let r = 0; r < this.R; r++) {
      const n = this.S - ((Math.random() * 10) | 0);
      const rope = { n, x: new Float32Array(n), y: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n),
        len: 5 + Math.random() * 6, col: COLORS[r % COLORS.length], phase: Math.random() * 6.28, freq: 0.6 + Math.random() * 1.2, width: 1.2 + Math.random() * 1.6,
        // each rope falls in its own direction (a fan of ±70° around straight down) so the bundle spreads like an anemone
        gdir: Math.PI / 2 + ((r + 0.5) / this.R - 0.5) * 2.4 };
      for (let i = 0; i < n; i++) { rope.x[i] = rope.px[i] = pointer.x; rope.y[i] = rope.py[i] = pointer.y + i * rope.len; }
      this.ropes.push(rope);
    }
    this.count = this.ropes.reduce((a, r) => a + r.n, 0);
    // spark pool
    const P = 900; this.P = P; this.sp = { x: new Float32Array(P), y: new Float32Array(P), vx: new Float32Array(P), vy: new Float32Array(P), life: new Float32Array(P), c: new Uint8Array(P) }; this.spi = 0;
    this.resize(width, height, dpr);
    this.ctx.fillStyle = '#050508'; this.ctx.fillRect(0, 0, width, height);
  },

  resize(w, h, dpr) {
    this.width = w; this.height = h;
    this.canvas.width = Math.floor(w * this.pr); this.canvas.height = Math.floor(h * this.pr);
    this.ctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    this.ctx.fillStyle = '#050508'; this.ctx.fillRect(0, 0, w, h);
  },

  spark(x, y, vx, vy, c) {
    const s = this.sp, i = this.spi; this.spi = (i + 1) % this.P;
    s.x[i] = x; s.y[i] = y; s.vx[i] = vx; s.vy[i] = vy; s.life[i] = 0.5 + Math.random() * 0.6; s.c[i] = c;
  },

  update(dt, t) {
    const { ctx, pointer: p } = this;
    const w = this.width, h = this.height;
    const sdt = Math.min(dt, 1 / 30);
    const dt2 = sdt * sdt;
    const elec = p.down;
    const G = elec ? 0 : 380, drag = elec ? 0.9 : 0.985;

    // fade
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(5,5,8,${1 - Math.pow(0.78, sdt * 60)})`; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    for (let r = 0; r < this.ropes.length; r++) {
      const rope = this.ropes[r], n = rope.n, x = rope.x, y = rope.y, px = rope.px, py = rope.py;
      // anchor: cursor with a small rotating offset so ropes fan out
      const a = t * 0.8 + (r / this.ropes.length) * Math.PI * 2;
      const ax = p.x + Math.cos(a) * 6, ay = p.y + Math.sin(a) * 6;
      // integrate
      const wind = Math.sin(t * rope.freq + rope.phase) * 160 + Math.sin(t * 0.37 + r) * 80;
      const gx = Math.cos(rope.gdir) * G, gy = Math.sin(rope.gdir) * G;
      for (let i = 1; i < n; i++) {
        const vx = (x[i] - px[i]) * drag, vy = (y[i] - py[i]) * drag;
        px[i] = x[i]; py[i] = y[i];
        let fx = wind * (i / n) + gx, fy = gy + Math.sin(t * 1.3 + rope.phase + i * 0.2) * 90 * (i / n);
        if (elec) { fx += (Math.random() - 0.5) * 9000; fy += (Math.random() - 0.5) * 9000; }
        x[i] += vx + fx * dt2; y[i] += vy + fy * dt2;
      }
      x[0] = ax; y[0] = ay; px[0] = ax; py[0] = ay;
      // constraints
      const L = rope.len;
      for (let k = 0; k < 4; k++) {
        for (let i = 0; i < n - 1; i++) {
          let dx = x[i + 1] - x[i], dy = y[i + 1] - y[i];
          const d = Math.sqrt(dx * dx + dy * dy) || 1e-4, diff = (d - L) / d;
          if (i === 0) { x[1] -= dx * diff; y[1] -= dy * diff; }
          else { dx *= diff * 0.5; dy *= diff * 0.5; x[i] += dx; y[i] += dy; x[i + 1] -= dx; y[i + 1] -= dy; }
        }
      }
      // tip speed → sparks
      const tip = n - 1, tvx = (x[tip] - px[tip]) / sdt, tvy = (y[tip] - py[tip]) / sdt, tsp = Math.hypot(tvx, tvy);
      if (tsp > 900 && Math.random() < 0.6) this.spark(x[tip], y[tip], tvx * 0.35 + (Math.random() - 0.5) * 200, tvy * 0.35 + (Math.random() - 0.5) * 200, r % COLORS.length);
      // draw: wide glow + bright core, smoothed through midpoints
      const c = rope.col;
      const path = () => {
        ctx.beginPath(); ctx.moveTo(x[0], y[0]);
        for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(x[i], y[i], (x[i] + x[i + 1]) / 2, (y[i] + y[i + 1]) / 2);
        ctx.lineTo(x[n - 1], y[n - 1]);
      };
      path();
      ctx.strokeStyle = elec ? 'rgba(200,230,255,0.18)' : `rgba(${c[0]},${c[1]},${c[2]},0.14)`; ctx.lineWidth = rope.width * 6; ctx.stroke();
      ctx.strokeStyle = elec ? 'rgba(255,255,255,0.95)' : `rgba(${c[0]},${c[1]},${c[2]},0.85)`; ctx.lineWidth = rope.width; ctx.stroke();
    }

    // sparks
    const s = this.sp;
    for (let i = 0; i < this.P; i++) {
      if (s.life[i] <= 0) continue;
      s.life[i] -= sdt; s.vy[i] += 600 * sdt; s.vx[i] *= 0.98; s.vy[i] *= 0.98;
      s.x[i] += s.vx[i] * sdt; s.y[i] += s.vy[i] * sdt;
      const c = COLORS[s.c[i]];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, s.life[i] * 2)})`;
      ctx.fillRect(s.x[i], s.y[i], 2, 2);
    }
    // anchor glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40);
    g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.3, 'rgba(25,240,255,0.25)'); g.addColorStop(1, 'rgba(25,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(p.x - 40, p.y - 40, 80, 80);
    ctx.globalCompositeOperation = 'source-over';
  },

  dispose() { this.canvas.remove(); },
};
