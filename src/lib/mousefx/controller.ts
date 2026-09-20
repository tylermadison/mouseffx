import { createPointer } from './pointer';
import { registry } from './registry';
import type { Effect, EffectDef, Pointer, Stats } from './types';

export interface ControllerOptions {
  container: HTMLElement;
  // 'showcase' (default): keys, URL hash, and window.mousefx select the effect.
  // 'fixed': hosts `effectId` only. No keys, no URL hash, no window.mousefx.
  mode?: 'showcase' | 'fixed';
  effectId?: string;
  onChange?(def: EffectDef): void;
  onStats?(stats: Stats): void;
  onError?(message: string): void;
  onToggleUi?(): void;
}

export interface Controller {
  select(id: string): Promise<void>;
  next(step?: number): void;
  destroy(): void;
}

// small debug / embedding API
interface MouseFxApi {
  select(id: string): Promise<void>;
  next(step?: number): void;
  registry: EffectDef[];
  pointer: Pointer;
  readonly current: Effect | null;
  readonly def: EffectDef | null;
}

declare global {
  interface Window { mousefx?: MouseFxApi }
}

// Hosts one effect at a time in `container`. Owns the frame loop and all
// global listeners. Browser only: call it from an effect hook, not during render.
export function createController({ container, mode = 'showcase', effectId, onChange, onStats, onError, onToggleUi }: ControllerOptions): Controller {
  const fixed = mode === 'fixed';
  const listeners = new AbortController();
  const signal = listeners.signal;
  const pointer = createPointer();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current: Effect | null = null, currentDef: EffectDef | null = null, loading = false, destroyed = false;
  let width = innerWidth, height = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);

  // #region doc:select
  async function select(id: string) {
    const def = registry.find((d) => d.id === id) || registry[0];
    if (destroyed || loading || (currentDef && currentDef.id === def.id)) return;
    loading = true;
    try {
      const mod = await def.load();
      // The host can unmount while the import is in flight (React Strict Mode does this).
      if (destroyed) return;
      if (current) { try { current.dispose(); } catch (e) { console.warn(e); } }
      container.replaceChildren();
      current = null;
      currentDef = def;
      mod.default.init({ container, pointer, width, height, dpr, reduced });
      current = mod.default;
      if (!fixed) location.hash = def.id;
      onChange?.(def);
    } catch (err) {
      console.error(err);
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      loading = false;
    }
  }
  // #endregion doc:select

  function next(step = 1) {
    if (fixed) return;
    const i = registry.findIndex((d) => d === currentDef);
    select(registry[(i + step + registry.length) % registry.length].id);
  }

  if (!fixed) addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const d = registry.find((r) => r.key === e.key);
    if (d) { select(d.id); return; }
    if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(1); }
    if (e.key === 'ArrowLeft') next(-1);
    if (e.key === 'h') onToggleUi?.();
  }, { signal });
  if (!fixed) addEventListener('hashchange', () => select(location.hash.slice(1)), { signal });

  // ---------- resize ----------
  let resizeT: ReturnType<typeof setTimeout> | undefined;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
      if (current) current.resize(width, height, dpr);
    }, 60);
  }, { signal });

  // #region doc:frame-loop
  // ---------- loop ----------
  let last = performance.now(), t = 0, fpsN = 0, hudT = 0, running = true, raf = 0;
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    cancelAnimationFrame(raf);
    if (running) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { signal });

  function frame(now: number) {
    if (!running || destroyed) return;
    raf = requestAnimationFrame(frame);
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
        onStats?.({ fps: Math.round(fpsN / hudT), ms, count: current.count || null });
        fpsN = 0; hudT = 0;
      }
    }
  }
  raf = requestAnimationFrame(frame);
  // #endregion doc:frame-loop
  const start = select(fixed ? (effectId ?? 'gravity-well') : (location.hash.slice(1) || 'gravity-well'));

  const api: MouseFxApi = { select, next, registry, pointer, get current() { return current; }, get def() { return currentDef; } };
  if (!fixed) window.mousefx = api;

  // #region doc:teardown
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    clearTimeout(resizeT);
    listeners.abort();
    pointer.dispose();
    if (current) { try { current.dispose(); } catch (e) { console.warn(e); } }
    current = null;
    container.replaceChildren();
    if (window.mousefx === api) delete window.mousefx;
  }
  // #endregion doc:teardown

  // In fixed mode the effect cannot change after the first selection.
  return { select: fixed ? () => start : select, next, destroy };
}
