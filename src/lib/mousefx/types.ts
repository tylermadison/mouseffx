// Shared view of the mouse that every effect receives. Positions are CSS px.
export interface Pointer {
  x: number; y: number;       // effective pointer (real or autopilot)
  sx: number; sy: number;     // smoothed (low-pass) pointer
  vx: number; vy: number;     // velocity px/s (smoothed)
  speed: number;              // |v|
  down: boolean;
  idle: boolean;              // true when autopilot drives
  rx: number; ry: number;     // last real pointer
  lastMove: number;
  downTime: number;
  t: number;
  update(dt: number, t: number): void;
  dispose(): void;
}

export interface EffectInit {
  container: HTMLElement;
  pointer: Pointer;
  width: number;
  height: number;
  dpr: number;
  reduced: boolean;
}

// Contract that every module in ./effects implements.
export interface Effect {
  init(opts: EffectInit): void;
  update(dt: number, t: number): void;
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
  count?: number;
}

export interface EffectDef {
  id: string;
  key: string;
  name: string;
  title: string;
  tech: string;
  desc: string;
  load: () => Promise<{ default: Effect }>;
}

export interface Stats {
  fps: number;
  ms: number;
  count: number | null;
}
