// MATRIX RAIN — terminal glyph rain on canvas 2D.
// Every grid cell is a spring-mass. The cursor repels cells (or pulls them in
// while the button is held), heats them white, and scrambles their glyphs.
// Glyphs are blitted from a pre-rendered atlas (no per-frame fillText).

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFXZ$#*+=<>:;|/\\';
const TINTS = ['#0a3d1a', '#39ff14', '#c8ffd4', '#ffffff', '#ffb000'];

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer; this.reduced = reduced;
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.pr = Math.min(dpr, 2);
    this.fs = width < 800 ? 14 : 16;
    this.buildAtlas();
    this.resize(width, height, dpr);
  },

  buildAtlas() {
    const fs = this.fs, pr = this.pr;
    this.cw = Math.round(fs * 0.62); this.ch = Math.round(fs * 1.15);
    const cw = this.cw * pr, ch = this.ch * pr;
    const a = document.createElement('canvas');
    a.width = cw * GLYPHS.length; a.height = ch * TINTS.length;
    const c = a.getContext('2d');
    c.font = `${fs * pr}px "JetBrains Mono", Menlo, Consolas, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    TINTS.forEach((tint, ti) => {
      c.fillStyle = tint;
      c.shadowColor = tint; c.shadowBlur = ti >= 2 ? 6 * pr : 0;
      for (let i = 0; i < GLYPHS.length; i++) c.fillText(GLYPHS[i], i * cw + cw / 2, ti * ch + ch / 2);
    });
    this.atlas = a; this.acw = cw; this.ach = ch;
  },

  resize(w, h, dpr) {
    this.width = w; this.height = h;
    this.canvas.width = Math.floor(w * this.pr); this.canvas.height = Math.floor(h * this.pr);
    this.ctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    this.cols = Math.ceil(w / this.cw) + 1; this.rows = Math.ceil(h / this.ch) + 1;
    const n = this.cols * this.rows; this.count = n;
    this.glyph = new Uint8Array(n); this.ox = new Float32Array(n); this.oy = new Float32Array(n);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n); this.heat = new Float32Array(n);
    for (let i = 0; i < n; i++) this.glyph[i] = (Math.random() * GLYPHS.length) | 0;
    this.head = new Float32Array(this.cols); this.speed = new Float32Array(this.cols); this.trail = new Float32Array(this.cols);
    for (let c = 0; c < this.cols; c++) this.resetCol(c, true);
    // vignette overlay, rendered once
    const v = document.createElement('canvas'); v.width = 256; v.height = 256;
    const vc = v.getContext('2d');
    const g = vc.createRadialGradient(128, 128, 60, 128, 128, 180);
    g.addColorStop(0, 'rgba(5,5,8,0)'); g.addColorStop(1, 'rgba(5,5,8,0.75)');
    vc.fillStyle = g; vc.fillRect(0, 0, 256, 256);
    this.vignette = v;
  },

  resetCol(c, initial) {
    this.head[c] = initial ? Math.random() * this.rows : -Math.random() * 30;
    this.speed[c] = 6 + Math.random() * 18;
    this.trail[c] = 6 + Math.random() * 22;
  },

  update(dt, t) {
    const { ctx, cols, rows, cw, ch, pointer: p } = this;
    const n = cols * rows;
    const sdt = Math.min(dt, 1 / 30) * (this.reduced ? 0.6 : 1);

    // rain heads
    for (let c = 0; c < cols; c++) {
      this.head[c] += this.speed[c] * sdt;
      if (this.head[c] - this.trail[c] > rows) this.resetCol(c, false);
    }
    // random glyph flicker
    const flips = (n * 0.02) | 0;
    for (let i = 0; i < flips; i++) { const k = (Math.random() * n) | 0; this.glyph[k] = (Math.random() * GLYPHS.length) | 0; }

    // spring physics + cursor force
    const R = 170, R2 = R * R, k = 55, damp = 7;
    const mx = p.x, my = p.y, push = p.down ? -1.0 : 1.0;
    const mvx = p.vx * 0.35, mvy = p.vy * 0.35;
    const c0 = Math.max(0, ((mx - R) / cw) | 0), c1 = Math.min(cols - 1, ((mx + R) / cw) | 0);
    const r0 = Math.max(0, ((my - R) / ch) | 0), r1 = Math.min(rows - 1, ((my + R) / ch) | 0);
    for (let i = 0; i < n; i++) {
      const ax = -k * this.ox[i] - damp * this.vx[i], ay = -k * this.oy[i] - damp * this.vy[i];
      this.vx[i] += ax * sdt; this.vy[i] += ay * sdt;
      this.ox[i] += this.vx[i] * sdt; this.oy[i] += this.vy[i] * sdt;
      if (this.heat[i] > 0) this.heat[i] = Math.max(0, this.heat[i] - sdt * 1.4);
    }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * cols + c;
      const cx = c * cw + cw / 2 + this.ox[i], cy = r * ch + ch / 2 + this.oy[i];
      const dx = cx - mx, dy = cy - my, d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      const d = Math.sqrt(d2) + 1e-3, f = (1 - d / R); const f2 = f * f;
      const F = f2 * 2600 * push;
      this.vx[i] += (dx / d * F + mvx * f2 * 6) * sdt; this.vy[i] += (dy / d * F + mvy * f2 * 6) * sdt;
      if (p.down) { // swirl while held
        this.vx[i] += -dy / d * f * 900 * sdt; this.vy[i] += dx / d * f * 900 * sdt;
      }
      this.heat[i] = Math.max(this.heat[i], f);
      if (Math.random() < f * 0.5) this.glyph[i] = (Math.random() * GLYPHS.length) | 0;
    }

    // draw
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1; ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    const atlas = this.atlas, acw = this.acw, ach = this.ach;
    for (let c = 0; c < cols; c++) {
      const head = this.head[c], trail = this.trail[c];
      const rStart = Math.max(0, Math.ceil(head - trail)), rEnd = Math.min(rows - 1, Math.floor(head));
      const x = c * cw;
      for (let r = 0; r < rows; r++) {
        const i = r * cols + c;
        const heat = this.heat[i];
        let b = 0, tint = 1;
        if (r >= rStart && r <= rEnd) {
          const dist = head - r;
          b = 1 - dist / trail; b = b * b * 0.9 + 0.1;
          if (dist < 1) tint = 2; // head glyph, bright
        }
        if (heat > 0.02) { b = Math.max(b, heat); tint = heat > 0.55 ? 3 : (heat > 0.25 ? 4 : 1); }
        else if (b === 0) { if (this.ox[i] * this.ox[i] + this.oy[i] * this.oy[i] > 4) { b = 0.18; tint = 0; } else continue; }
        ctx.globalAlpha = b;
        ctx.drawImage(atlas, this.glyph[i] * acw, tint * ach, acw, ach, x + this.ox[i], r * ch + this.oy[i], cw, ch);
      }
    }
    // cursor glow
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
    g.addColorStop(0, p.down ? 'rgba(255,176,0,0.35)' : 'rgba(57,255,20,0.22)'); g.addColorStop(1, 'rgba(57,255,20,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - 120, my - 120, 240, 240);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.vignette, 0, 0, this.width, this.height);
  },

  dispose() { this.canvas.remove(); },
};
