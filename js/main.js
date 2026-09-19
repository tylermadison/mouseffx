import { createPointer } from './pointer.js';

const registry = [
  { id: 'gravity-well', key: '1', name: 'gravity-well', title: 'GRAVITY WELL', tech: 'three.js GPGPU',
    desc: 'A quarter‑million GPU particles orbit and fall into your cursor through curl‑noise turbulence.', load: () => import('./effects/gravityWell.js') },
  { id: 'fluid', key: '2', name: 'neon-fluid', title: 'NEON FLUID', tech: 'WebGL2 Navier–Stokes',
    desc: 'A real‑time incompressible fluid solver. Your cursor injects velocity and glowing dye.', load: () => import('./effects/fluid.js') },
  { id: 'matrix', key: '3', name: 'matrix-rain', title: 'MATRIX RAIN', tech: 'canvas 2D springs',
    desc: 'Terminal glyph rain. Every glyph is a spring‑mass that your cursor pushes out of the grid.', load: () => import('./effects/matrixRain.js') },
  { id: 'orbits', key: '4', name: 'n-body', title: 'N‑BODY', tech: 'canvas 2D gravity',
    desc: 'Your cursor is a star. Thousands of bodies slingshot around it, leaving light trails. Hold to go nova.', load: () => import('./effects/orbits.js') },
  { id: 'tendrils', key: '5', name: 'tendrils', title: 'TENDRILS', tech: 'canvas 2D verlet',
    desc: 'Verlet rope chains anchored to your cursor. Whip them, and they spray sparks.', load: () => import('./effects/tendrils.js') },
  { id: 'nebula', key: '6', name: 'nebula', title: 'NEBULA', tech: 'three.js fbm shader',
    desc: 'Domain‑warped noise gas lit by your cursor. The cursor also bends space like a lens.', load: () => import('./effects/nebula.js') },
  { id: 'ascii', key: '7', name: 'ascii-field', title: 'ASCII FIELD', tech: 'canvas 2D flow field',
    desc: 'A vector field drawn in terminal glyphs. Your cursor is a vortex. Packets ride the flow.', load: () => import('./effects/asciiField.js') },
  { id: 'warp', key: '8', name: 'warp-drive', title: 'WARP DRIVE', tech: 'three.js line streaks',
    desc: 'Hyperspace starfield. Move fast to jump to warp. Your cursor steers and bends the light.', load: () => import('./effects/warp.js') },
];

const $ = (s) => document.querySelector(s);
const container = $('#fx');
const pointer = createPointer();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let current = null, currentDef = null, loading = false;
let width = innerWidth, height = innerHeight;
let dpr = Math.min(devicePixelRatio || 1, 2);

// ---------- HUD ----------
const list = $('#fx-list');
registry.forEach((d) => {
  const li = document.createElement('li');
  li.dataset.id = d.id;
  li.innerHTML = `<span class="k">${d.key}</span><span class="n">${d.name}</span><span class="t">${d.tech}</span>`;
  li.addEventListener('click', () => select(d.id));
  list.appendChild(li);
});
const fpsEl = $('#fps'), msEl = $('#ms'), techEl = $('#tech'), countEl = $('#count');

async function select(id) {
  const def = registry.find((d) => d.id === id) || registry[0];
  if (loading || (currentDef && currentDef.id === def.id)) return;
  loading = true;
  try {
    const mod = await def.load();
    if (current) { try { current.dispose(); } catch (e) { console.warn(e); } }
    container.innerHTML = '';
    current = mod.default;
    currentDef = def;
    current.init({ container, pointer, width, height, dpr, reduced });
    location.hash = def.id;
    $('#fx-title').textContent = def.title;
    $('#fx-desc').textContent = def.desc;
    $('#hud-cmd').textContent = `run ${def.name}`;
    techEl.textContent = def.tech;
    list.querySelectorAll('li').forEach((li) => li.classList.toggle('active', li.dataset.id === def.id));
  } catch (err) {
    console.error(err);
    $('#fx-desc').textContent = `error: ${err.message}`;
  }
  loading = false;
}

function next(step = 1) {
  const i = registry.findIndex((d) => d === currentDef);
  select(registry[(i + step + registry.length) % registry.length].id);
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const d = registry.find((r) => r.key === e.key);
  if (d) return select(d.id);
  if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(1); }
  if (e.key === 'ArrowLeft') next(-1);
  if (e.key === 'h') { $('#hud').classList.toggle('hidden'); $('#site').classList.toggle('hidden'); }
});
addEventListener('hashchange', () => select(location.hash.slice(1)));

// ---------- resize ----------
let resizeT = 0;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    if (current) current.resize(width, height, dpr);
  }, 60);
});

// ---------- loop ----------
let last = performance.now(), t = 0, fpsN = 0, hudT = 0, running = true;
document.addEventListener('visibilitychange', () => {
  running = document.visibilityState === 'visible';
  if (running) { last = performance.now(); requestAnimationFrame(frame); }
});

function frame(now) {
  if (!running) return;
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;          // clamp big hitches so physics stays stable
  t += dt;
  pointer.update(dt, t);
  if (current && !loading) {
    const t0 = performance.now();
    current.update(dt, t);
    const ms = performance.now() - t0;
    fpsN++;
    hudT += dt;
    if (hudT > 0.5) {
      fpsEl.textContent = Math.round(fpsN / hudT);
      msEl.textContent = ms.toFixed(1);
      countEl.textContent = current.count ? current.count.toLocaleString() : '--';
      fpsN = 0; hudT = 0;
    }
  }
}
requestAnimationFrame(frame);
select(location.hash.slice(1) || 'gravity-well');

// small debug / embedding API
window.mousefx = { select, next, registry, pointer, get current() { return current; }, get def() { return currentDef; } };
