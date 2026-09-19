// Pointer tracker. Gives every effect the same view of the mouse:
// position (CSS px), smoothed position, velocity (px/s), button state,
// and an "auto pilot" that drifts the pointer when the user is idle so the
// background never freezes.
export function createPointer() {
  const p = {
    x: innerWidth / 2, y: innerHeight / 2,     // effective pointer (real or autopilot)
    sx: innerWidth / 2, sy: innerHeight / 2,   // smoothed (low-pass) pointer
    vx: 0, vy: 0,                              // velocity px/s (smoothed)
    speed: 0,                                  // |v|
    down: false,
    idle: true,                                // true when autopilot drives
    rx: innerWidth / 2, ry: innerHeight / 2,   // last real pointer
    lastMove: -1e9,
    downTime: 0,
    t: 0,
  };
  let lx = p.x, ly = p.y;

  const onMove = (e) => {
    p.rx = e.clientX; p.ry = e.clientY;
    p.lastMove = performance.now();
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', (e) => { onMove(e); p.down = true; p.downTime = performance.now(); }, { passive: true });
  addEventListener('pointerup', () => { p.down = false; }, { passive: true });
  addEventListener('pointercancel', () => { p.down = false; }, { passive: true });
  addEventListener('blur', () => { p.down = false; });

  const IDLE_MS = 2500;

  p.update = (dt, t) => {
    p.t = t;
    const now = performance.now();
    const since = now - p.lastMove;
    if (since > IDLE_MS) {
      // Autopilot: slow Lissajous drift around the centre of the screen.
      const k = Math.min(1, (since - IDLE_MS) / 2500); // ease in over 2.5s
      const cx = innerWidth * 0.5, cy = innerHeight * 0.45;
      const ax = innerWidth * 0.32, ay = innerHeight * 0.28;
      const tx = cx + Math.sin(t * 0.37) * ax * Math.cos(t * 0.11);
      const ty = cy + Math.sin(t * 0.53 + 1.3) * ay;
      p.x += ((tx - p.x) * k + (p.rx - p.x) * (1 - k)) * Math.min(1, dt * 3);
      p.y += ((ty - p.y) * k + (p.ry - p.y) * (1 - k)) * Math.min(1, dt * 3);
      p.idle = true;
    } else {
      p.x = p.rx; p.y = p.ry; p.idle = false;
    }
    // velocity
    if (dt > 0) {
      let ivx = (p.x - lx) / dt, ivy = (p.y - ly) / dt;
      const isp = Math.hypot(ivx, ivy); if (isp > 5000) { ivx *= 5000 / isp; ivy *= 5000 / isp; }
      const a = 1 - Math.exp(-dt * 12);
      p.vx += (ivx - p.vx) * a; p.vy += (ivy - p.vy) * a;
    }
    lx = p.x; ly = p.y;
    p.speed = Math.hypot(p.vx, p.vy);
    // smoothed position
    const s = 1 - Math.exp(-dt * 10);
    p.sx += (p.x - p.sx) * s; p.sy += (p.y - p.sy) * s;
  };
  return p;
}
