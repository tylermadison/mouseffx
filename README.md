# MOUSEFX — physics-based mouse follower backgrounds

Eight dark, neon, terminal/space themed background effects that react to the
cursor. Each one is a self-contained module. Drop one behind a website.

## Run

```bash
python3 -m http.server 8787
```

Open <http://localhost:8787>. Keys `1`–`8` switch effects, `space` goes to the
next one, `h` hides the UI. Hold the mouse button in every effect for a second
mode. The URL hash selects an effect (`#fluid`), and `?q=1024` raises the
gravity well to 1,048,576 particles.

## Effects

| # | id | tech | what happens |
|---|----|------|--------------|
| 1 | `gravity-well` | three.js GPGPU, float textures, ping‑pong | 262k particles. Newtonian pull + tangential swirl + curl noise + cursor drag. Feedback trails. Hold → repulsor. |
| 2 | `fluid` | raw WebGL2, stable fluids | Navier–Stokes solver: vorticity, 20 Jacobi pressure iterations, advection. Cursor splats velocity and neon dye. Hold → burst ring. |
| 3 | `matrix` | canvas 2D, glyph atlas | Glyph rain where every cell is a spring‑mass. Cursor repels and heats glyphs. Hold → pull + swirl. |
| 4 | `orbits` | canvas 2D | N‑body around the cursor with softened gravity, colour by speed, destination‑out trails. Press → nova shockwave, hold → repulsor. |
| 5 | `tendrils` | canvas 2D verlet | Rope chains pinned to the cursor. Gravity, wind, whip, tip sparks. Hold → electrified. |
| 6 | `nebula` | three.js fragment shader | Domain‑warped fbm gas at capped resolution. Cursor is a light and a lens (pull + swirl). Hold → stronger swirl, warm light. |
| 7 | `ascii` | canvas 2D, glyph atlas | Vector field drawn with `- / | \`. Cursor is a vortex and a wind source. Packets ride the flow. Hold → sink. |
| 8 | `warp` | three.js line segments | Hyperspace streaks that converge on a cursor‑steered vanishing point. Fast cursor or hold → warp. Cursor lenses nearby streaks. |

## Use in a site

```html
<div id="fx"></div>            <!-- position: fixed; inset: 0; z-index: 0; pointer-events: none -->
<script type="importmap">{ "imports": { "three": "./vendor/three.module.min.js" } }</script>
<script type="module">
  import { createPointer } from './js/pointer.js';
  import fx from './js/effects/fluid.js';
  const pointer = createPointer();
  fx.init({ container: document.getElementById('fx'), pointer, width: innerWidth, height: innerHeight, dpr: devicePixelRatio, reduced: false });
  let last = performance.now(), t = 0;
  (function loop(now) { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; pointer.update(dt, t); fx.update(dt, t); })(last);
  addEventListener('resize', () => fx.resize(innerWidth, innerHeight, devicePixelRatio));
</script>
```

Every effect implements `init({container, pointer, width, height, dpr, reduced})`,
`update(dt, t)`, `resize(w, h, dpr)`, `dispose()` and exposes `count`.

## Performance notes

- Device pixel ratio is capped (1.5 for WebGL, 2 for canvas). The nebula caps
  its internal width at 1100 px because fbm cost is per pixel.
- Canvas 2D text effects blit from a pre-rendered glyph atlas. There is no
  `fillText` in the hot loop.
- The loop pauses when the tab is hidden. `dt` is clamped so physics stays
  stable after a hitch.
- `prefers-reduced-motion` slows the simulations.
- The pointer has an autopilot: after 2.5 s without input it drifts in a slow
  Lissajous path so the background never freezes.

## Measured (M-series Mac, 1024×768 CSS px, dpr 2, Chromium)

Live HUD readings. `ms` is CPU time of `update()`; GPU time is not included
for the WebGL effects, which is why it reads near zero there.

| effect | fps | update ms | n |
|--------|-----|-----------|---|
| gravity-well | 60 | 0.1 | 262,144 particles |
| fluid | 60 | 0.2 | 34,080 sim cells (dye 1024) |
| matrix | 59 | 1.2 | 4,576 glyph springs |
| orbits | 60 | 1.1 | 3,200 bodies |
| tendrils | 60 | 0.7 | 539 verlet points |
| nebula | 60 | 0.1 | 786,432 shaded pixels |
| ascii | 55–60 | ~1 | 4,738 cells + 90 packets |
| warp | 60 | 1.0 | 14,000 streaks |

`window.mousefx` exposes `select(id)`, `next()`, `registry`, `pointer` and the
`current` effect for debugging or embedding.

## Research

- [Codrops — Crafting a Dreamy Particle Effect with Three.js and GPGPU](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/)
- [three.js forum — GPGPU Particles showcase](https://discourse.threejs.org/t/gpgpu-particles/90558)
- [aadebdeb — GPGPU particles with curl noise](https://github.com/aadebdeb/study-three.js/blob/master/gpgpu-particles-with-curl-noise.html)
- [PavelDoGreat — WebGL Fluid Simulation](https://paveldogreat.github.io/WebGL-Fluid-Simulation/)
- [Locko2901 — webgl-fluid-simulation](https://github.com/Locko2901/webgl-fluid-simulation)
- [Codrops — cursor tag](https://tympanus.net/codrops/tag/cursor/)
- [Cuberto — Mouse Follower](https://cuberto.com/blog/cuberto-mouse-follower/)
