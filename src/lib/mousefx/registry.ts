import type { Effect, EffectDef } from './types';

// The effect modules are plain JavaScript. The Effect interface is their contract.
const as = (m: Promise<unknown>) => m as Promise<{ default: Effect }>;

export const registry: EffectDef[] = [
  { id: 'gravity-well', key: '1', name: 'gravity-well', title: 'GRAVITY WELL', tech: 'three.js GPGPU',
    desc: 'A quarter‑million GPU particles orbit and fall into your cursor through curl‑noise turbulence.', load: () => as(import('./effects/gravityWell.js')) },
  { id: 'fluid', key: '2', name: 'neon-fluid', title: 'NEON FLUID', tech: 'WebGL2 Navier–Stokes',
    desc: 'A real‑time incompressible fluid solver. Your cursor injects velocity and glowing dye.', load: () => as(import('./effects/fluid.js')) },
  { id: 'matrix', key: '3', name: 'matrix-rain', title: 'MATRIX RAIN', tech: 'canvas 2D springs',
    desc: 'Terminal glyph rain. Every glyph is a spring‑mass that your cursor pushes out of the grid.', load: () => as(import('./effects/matrixRain.js')) },
  { id: 'orbits', key: '4', name: 'n-body', title: 'N‑BODY', tech: 'canvas 2D gravity',
    desc: 'Your cursor is a star. Thousands of bodies slingshot around it, leaving light trails. Hold to go nova.', load: () => as(import('./effects/orbits.js')) },
  { id: 'tendrils', key: '5', name: 'tendrils', title: 'TENDRILS', tech: 'canvas 2D verlet',
    desc: 'Verlet rope chains anchored to your cursor. Whip them, and they spray sparks.', load: () => as(import('./effects/tendrils.js')) },
  { id: 'nebula', key: '6', name: 'nebula', title: 'NEBULA', tech: 'three.js fbm shader',
    desc: 'Domain‑warped noise gas lit by your cursor. The cursor also bends space like a lens.', load: () => as(import('./effects/nebula.js')) },
  { id: 'ascii', key: '7', name: 'ascii-field', title: 'ASCII FIELD', tech: 'canvas 2D flow field',
    desc: 'A vector field drawn in terminal glyphs. Your cursor is a vortex. Packets ride the flow.', load: () => as(import('./effects/asciiField.js')) },
  { id: 'warp', key: '8', name: 'warp-drive', title: 'WARP DRIVE', tech: 'three.js line streaks',
    desc: 'Hyperspace starfield. Move fast to jump to warp. Your cursor steers and bends the light.', load: () => as(import('./effects/warp.js')) },
];
