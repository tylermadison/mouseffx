# MOUSEFX — physics-based mouse follower backgrounds

Eight dark, neon, terminal/space themed background effects that react to the
cursor. Each one is a self-contained module. Drop one behind a website.

## Run

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. Keys `1`–`8` switch effects, `space` goes to the
next one, `h` hides the UI. Hold the mouse button in every effect for a second
mode. The URL hash selects an effect (`#fluid`), and `?q=1024` raises the
gravity well to 1,048,576 particles.

`pnpm build` and `pnpm start` run the production build. `pnpm lint`,
`pnpm typecheck`, and `pnpm check:docs` check the code and the docs.

## Layout

This is a Next.js app (App Router, TypeScript).

| path | what it holds |
|------|---------------|
| `src/app/` | `layout.tsx`, `page.tsx` (server-rendered markup), `globals.css` |
| `src/components/MouseFx.tsx` | client components: provider, background layer, hero text, HUD |
| `src/lib/mousefx/controller.ts` | effect selection, frame loop, keys, hash, resize, teardown |
| `src/lib/mousefx/pointer.ts` | shared pointer with autopilot |
| `src/lib/mousefx/catalogue.ts` | plain data for the eight effects (safe to import on the server) |
| `src/lib/mousefx/registry.ts` | the catalogue plus one `import()` for each effect, loaded on demand |
| `src/app/docs/`, `src/components/docs/`, `src/content/docs/` | the docs routes, components, and MDX content |
| `scripts/check-docs.mjs` | checks the docs against the effect source |
| `src/lib/mousefx/effects/` | the effect modules (plain JavaScript) |

## Docs

The site has a docs section that explains each effect: its model with formulas, its
frame pipeline, its real code, and the reason for each tuned constant.

| route | content |
|-------|---------|
| `/docs` | index of the eight effects |
| `/docs/<effect-id>` | deep dive for one effect. The effect runs behind the page, with a control to stop it. |
| `/docs/architecture` | the shared runtime: effect contract, pointer, frame loop, teardown, embedding |

The content is MDX in `src/content/docs/`. The docs cannot go out of date silently:

- Code excerpts are read from the real modules at build time. A region in a module
  looks like this, each marker on its own line:

  ```js
  // #region doc:constraints
  …code…
  // #endregion doc:constraints
  ```

  A page shows it with `<Excerpt file="effects/tendrils.js" region="constraints" />`.
- Each documented constant has its exact source text (`<Param literal="soft = 900" … />`).
- `pnpm check:docs` checks the section order, each `literal`, and each region. It runs
  before `next build`, so a changed constant or a removed region fails the build.

When you change a module, read its docs page. The check finds changed constants and
code, but it cannot find prose that is no longer correct.

MDX has no table syntax here (no plugins). Use `<Table head={[…]} rows={[[…]]} />`.

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

Copy `src/lib/mousefx/` into a project that has `three@0.160` installed. In a
React client component:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { createPointer } from '@/lib/mousefx/pointer';
import fx from '@/lib/mousefx/effects/fluid.js';

export function Background() {
  const ref = useRef<HTMLDivElement>(null);   // position: fixed; inset: 0; z-index: 0; pointer-events: none
  useEffect(() => {
    const pointer = createPointer();
    fx.init({ container: ref.current, pointer, width: innerWidth, height: innerHeight, dpr: devicePixelRatio, reduced: false });
    let last = performance.now(), t = 0, raf = 0;
    const loop = (now: number) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; pointer.update(dt, t); fx.update(dt, t); };
    raf = requestAnimationFrame(loop);
    const onResize = () => fx.resize(innerWidth, innerHeight, devicePixelRatio);
    addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); pointer.dispose(); fx.dispose(); };
  }, []);
  return <div ref={ref} id="fx" aria-hidden="true" />;
}
```

The modules have no React dependency. Without React, do the same steps in a
module script and call `pointer.dispose()` and `fx.dispose()` on teardown.

Every effect implements `init({container, pointer, width, height, dpr, reduced})`,
`update(dt, t)`, `resize(w, h, dpr)`, `dispose()` and exposes `count`.

## Performance notes

- Device pixel ratio is capped (1.5 for WebGL, 2 for canvas). The nebula caps
  its internal width at 1100 px because fbm cost is per pixel.
- Canvas 2D text effects blit from a pre-rendered glyph atlas. There is no
  `fillText` in the hot loop.
- The loop pauses when the tab is hidden. `dt` is clamped so physics stays
  stable after a hitch.
- `prefers-reduced-motion` slows five of the eight simulations (`gravity-well`, `matrix`,
  `orbits`, `ascii`, `warp`). `fluid`, `tendrils`, and `nebula` do not read the flag. On the
  docs pages the background does not start until the visitor starts it.
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

`window.mousefx` exposes `select(id)`, `next()`, `registry`, `pointer`, the
`current` effect and its `def` for debugging or embedding. It exists while the
page is mounted.

## Research

- [Codrops — Crafting a Dreamy Particle Effect with Three.js and GPGPU](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/)
- [three.js forum — GPGPU Particles showcase](https://discourse.threejs.org/t/gpgpu-particles/90558)
- [aadebdeb — GPGPU particles with curl noise](https://github.com/aadebdeb/study-three.js/blob/master/gpgpu-particles-with-curl-noise.html)
- [PavelDoGreat — WebGL Fluid Simulation](https://paveldogreat.github.io/WebGL-Fluid-Simulation/)
- [Locko2901 — webgl-fluid-simulation](https://github.com/Locko2901/webgl-fluid-simulation)
- [Codrops — cursor tag](https://tympanus.net/codrops/tag/cursor/)
- [Cuberto — Mouse Follower](https://cuberto.com/blog/cuberto-mouse-follower/)
