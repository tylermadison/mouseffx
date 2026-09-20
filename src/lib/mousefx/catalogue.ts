import type { EffectInfo } from './types';

// Plain data for the eight effects, in catalogue order. No browser API and no
// import() here, so server components can use it. registry.ts adds the loaders.
export const catalogue: EffectInfo[] = [
  { id: 'gravity-well', key: '1', name: 'gravity-well', title: 'GRAVITY WELL', tech: 'three.js GPGPU', file: 'effects/gravityWell.js',
    desc: 'A quarter‑million GPU particles orbit and fall into your cursor through curl‑noise turbulence.' },
  { id: 'fluid', key: '2', name: 'neon-fluid', title: 'NEON FLUID', tech: 'WebGL2 Navier–Stokes', file: 'effects/fluid.js',
    desc: 'A real‑time incompressible fluid solver. Your cursor injects velocity and glowing dye.' },
  { id: 'matrix', key: '3', name: 'matrix-rain', title: 'MATRIX RAIN', tech: 'canvas 2D springs', file: 'effects/matrixRain.js',
    desc: 'Terminal glyph rain. Every glyph is a spring‑mass that your cursor pushes out of the grid.' },
  { id: 'orbits', key: '4', name: 'n-body', title: 'N‑BODY', tech: 'canvas 2D gravity', file: 'effects/orbits.js',
    desc: 'Your cursor is a star. Thousands of bodies slingshot around it, leaving light trails. Hold to go nova.' },
  { id: 'tendrils', key: '5', name: 'tendrils', title: 'TENDRILS', tech: 'canvas 2D verlet', file: 'effects/tendrils.js',
    desc: 'Verlet rope chains anchored to your cursor. Whip them, and they spray sparks.' },
  { id: 'nebula', key: '6', name: 'nebula', title: 'NEBULA', tech: 'three.js fbm shader', file: 'effects/nebula.js',
    desc: 'Domain‑warped noise gas lit by your cursor. The cursor also bends space like a lens.' },
  { id: 'ascii', key: '7', name: 'ascii-field', title: 'ASCII FIELD', tech: 'canvas 2D flow field', file: 'effects/asciiField.js',
    desc: 'A vector field drawn in terminal glyphs. Your cursor is a vortex. Packets ride the flow.' },
  { id: 'warp', key: '8', name: 'warp-drive', title: 'WARP DRIVE', tech: 'three.js line streaks', file: 'effects/warp.js',
    desc: 'Hyperspace starfield. Move fast to jump to warp. Your cursor steers and bends the light.' },
];
