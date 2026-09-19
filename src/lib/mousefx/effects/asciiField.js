// ASCII FIELD — a 2D vector field rendered as terminal glyphs, canvas 2D.
// Field = time-varying value noise + a cursor vortex (+ cursor wind).
// Glyph = direction of the local vector; brightness = its magnitude.
// "Packets" are advected by the field and light up the cells they cross.

const DIR = '-/|\\';              // angle buckets (mod π)
const HOT = '+*#@';               // very strong flow
const HEX = '0123456789ABCDEF';
const ATLAS = DIR + HOT + HEX + '·';
const TINTS = ['#0e4a22', '#39ff14', '#c8ffd4', '#ffb000', '#ffffff'];

function vnoise(x, y, seed) {
  // 2D value noise with a cheap integer hash
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => { let n = (a * 374761393 + b * 668265263 + seed * 1274126177) | 0; n = ((n ^ (n >> 13)) * 1274126177) | 0; return ((n ^ (n >> 16)) & 0xffff) / 0xffff; };
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export default {
  count: 0,
  init({ container, pointer, width, height, dpr, reduced }) {
    this.pointer = pointer; this.reduced = reduced;
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.pr = Math.min(dpr, 2);
    this.fs = width < 800 ? 12 : 14;
    this.buildAtlas();
    const P = width < 800 ? 40 : 90; this.P = P;
    this.px = new Float32Array(P); this.py = new Float32Array(P); this.pc = new Uint8Array(P);
    for (let i = 0; i < P; i++) { this.px[i] = Math.random() * width; this.py[i] = Math.random() * height; this.pc[i] = (Math.random() * 16) | 0; }
    this.resize(width, height, dpr);
  },

  buildAtlas() {
    const fs = this.fs, pr = this.pr;
    this.cw = Math.round(fs * 0.7); this.ch = Math.round(fs * 1.2);
    const cw = this.cw * pr, ch = this.ch * pr;
    const a = document.createElement('canvas');
    a.width = cw * ATLAS.length; a.height = ch * TINTS.length;
    const c = a.getContext('2d');
    c.font = `${fs * pr}px "JetBrains Mono", Menlo, Consolas, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    TINTS.forEach((tint, ti) => {
      c.fillStyle = tint; c.shadowColor = tint; c.shadowBlur = ti >= 3 ? 5 * pr : 0;
      for (let i = 0; i < ATLAS.length; i++) c.fillText(ATLAS[i], i * cw + cw / 2, ti * ch + ch / 2);
    });
    this.atlas = a; this.acw = cw; this.ach = ch;
  },

  resize(w, h, dpr) {
    this.width = w; this.height = h;
    this.canvas.width = Math.floor(w * this.pr); this.canvas.height = Math.floor(h * this.pr);
    this.ctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    this.cols = Math.ceil(w / this.cw); this.rows = Math.ceil(h / this.ch);
    const n = this.cols * this.rows; this.count = n;
    this.heat = new Float32Array(n); this.hchar = new Uint8Array(n);
    this.fx = new Float32Array(n); this.fy = new Float32Array(n);
  },

  // field vector at (x,y) in px → writes to out[0..1]
  field(x, y, t, out) {
    const p = this.pointer;
    const s = 0.0028;
    const n1 = vnoise(x * s, y * s + t * 0.08, 1), n2 = vnoise(x * s * 2.1 + 40, y * s * 2.1 - t * 0.05, 2);
    const ang = (n1 * 0.7 + n2 * 0.3) * Math.PI * 4 + t * 0.1;
    let mag = 0.35 + n2 * 0.5;
    let vx = Math.cos(ang) * mag, vy = Math.sin(ang) * mag;
    const dx = x - p.sx, dy = y - p.sy, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) + 1;
    const fall = Math.exp(-r2 / (2 * 190 * 190));
    const A = 1.7 * fall * (p.down ? 1.8 : 1);
    vx += (-dy / r) * A; vy += (dx / r) * A;                            // vortex
    const rad = p.down ? -1.2 : 0.7;                                      // hold: sink, else gentle source
    vx += (dx / r) * rad * fall; vy += (dy / r) * rad * fall;
    vx += p.vx * 0.0025 * fall; vy += p.vy * 0.0025 * fall;              // wind from cursor motion
    out[0] = vx; out[1] = vy;
  },

  update(dt, t) {
    const { ctx, cols, rows, cw, ch, pointer: p } = this;
    const w = this.width, h = this.height, n = cols * rows;
    const sdt = Math.min(dt, 1 / 30) * (this.reduced ? 0.5 : 1);
    const v = [0, 0];

    // sample the field at every cell
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      this.field(c * cw + cw / 2, r * ch + ch / 2, t, v);
      this.fx[i] = v[0]; this.fy[i] = v[1];
      if (this.heat[i] > 0) this.heat[i] = Math.max(0, this.heat[i] - sdt * 2.6);
    }
    // packets ride the field
    for (let i = 0; i < this.P; i++) {
      let c = (this.px[i] / cw) | 0, r = (this.py[i] / ch) | 0;
      c = Math.min(cols - 1, Math.max(0, c)); r = Math.min(rows - 1, Math.max(0, r));
      const k = r * cols + c;
      const spd = 160;
      this.px[i] += this.fx[k] * spd * sdt; this.py[i] += this.fy[k] * spd * sdt;
      if (this.px[i] < 0) this.px[i] += w; if (this.px[i] >= w) this.px[i] -= w;
      if (this.py[i] < 0) this.py[i] += h; if (this.py[i] >= h) this.py[i] -= h;
      this.heat[k] = 1; this.hchar[k] = this.pc[i];
      if (Math.random() < 0.05) this.pc[i] = (Math.random() * 16) | 0;
    }

    // draw
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1; ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const atlas = this.atlas, acw = this.acw, ach = this.ach;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const vx = this.fx[i], vy = this.fy[i], mag = Math.sqrt(vx * vx + vy * vy);
      const heat = this.heat[i];
      let glyph, tint, alpha;
      if (heat > 0.05) { glyph = 8 + this.hchar[i]; tint = heat > 0.8 ? 4 : 3; alpha = 0.1 + heat * 0.6; }
      else if (mag < 0.3) { glyph = 24; tint = 0; alpha = 0.35; }
      else {
        let a = Math.atan2(vy, vx); if (a < 0) a += Math.PI; // 0..π
        const b = Math.round(a / (Math.PI / 4)) % 4;         // 0:-  1:/  2:|  3:\
        // canvas y points down, so "/" and "\" swap
        glyph = b === 1 ? 3 : (b === 3 ? 1 : b);
        if (mag > 2.6) { glyph = 4 + (((c * 7 + r * 13 + (t * 8 | 0)) % 4)); tint = 2; alpha = Math.min(0.55, mag * 0.18); }
        else { tint = mag > 1.6 ? 2 : 1; alpha = Math.min(0.8, 0.04 + mag * 0.28); }
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(atlas, glyph * acw, tint * ach, acw, ach, c * cw, r * ch, cw, ch);
    }
    // terminal readout at the cursor
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffb000';
    ctx.font = `${this.fs}px "JetBrains Mono", Menlo, Consolas, monospace`; ctx.textBaseline = 'top';
    const tx = p.x + 18 > w - 170 ? p.x - 172 : p.x + 18;
    ctx.fillText(`[x:${String(p.x | 0).padStart(4, '0')} y:${String(p.y | 0).padStart(4, '0')} ${p.down ? 'SINK' : 'VORTEX'}]`, tx, p.y + 14);
    ctx.globalCompositeOperation = 'source-over';
  },

  dispose() { this.canvas.remove(); },
};
