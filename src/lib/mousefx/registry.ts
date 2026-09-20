import { catalogue } from './catalogue';
import type { Effect, EffectDef } from './types';

// The effect modules are plain JavaScript. The Effect interface is their contract.
const as = (m: Promise<unknown>) => m as Promise<{ default: Effect }>;

// One literal import() for each effect, so that the bundler makes one chunk for each.
const loaders: Record<string, () => Promise<{ default: Effect }>> = {
  'gravity-well': () => as(import('./effects/gravityWell.js')),
  'fluid': () => as(import('./effects/fluid.js')),
  'matrix': () => as(import('./effects/matrixRain.js')),
  'orbits': () => as(import('./effects/orbits.js')),
  'tendrils': () => as(import('./effects/tendrils.js')),
  'nebula': () => as(import('./effects/nebula.js')),
  'ascii': () => as(import('./effects/asciiField.js')),
  'warp': () => as(import('./effects/warp.js')),
};

export const registry: EffectDef[] = catalogue.map((info) => ({ ...info, load: loaders[info.id] }));
