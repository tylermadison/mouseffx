'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createController } from '@/lib/mousefx/controller';
import type { Stats } from '@/lib/mousefx/types';

type BgState = 'pending' | 'running' | 'stopped';

// The visitor's choice for this browser session. Storage can throw (private
// mode, blocked site data), so there is an in-memory fallback.
const KEY = 'mousefx-docs-bg';
const EVENT = 'mousefx-docs-bg';
let memory: string | null = null;

function readChoice(): string | null {
  try { return sessionStorage.getItem(KEY) ?? memory; } catch { return memory; }
}
function writeChoice(v: 'on' | 'off') {
  memory = v;
  try { sessionStorage.setItem(KEY, v); } catch { /* keep the in-memory value */ }
  dispatchEvent(new Event(EVENT));
}
function subscribe(notify: () => void) {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', notify);
  addEventListener(EVENT, notify);
  return () => { mq.removeEventListener('change', notify); removeEventListener(EVENT, notify); };
}
// No choice yet: the background runs, unless the visitor asked for reduced motion.
function snapshot(): BgState {
  const choice = readChoice();
  if (choice) return choice === 'on' ? 'running' : 'stopped';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'stopped' : 'running';
}
const serverSnapshot = (): BgState => 'pending';

// Live background for one effect docs page: the effect in fixed-effect mode,
// a stop / start control, and the live statistics.
export function FxBackground({ effectId }: { effectId: string }) {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [stats, setStats] = useState<Stats | null>(null);

  // The controller lives as long as the #fx node (same pattern as the showcase).
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const controller = createController({ container: node, mode: 'fixed', effectId, onStats: setStats });
    return () => { controller.destroy(); setStats(null); };
  }, [effectId]);

  const running = state === 'running';
  return (
    <>
      {/* In <body>, not in the panel: backdrop-filter on the panel makes it the
          containing block for position: fixed, and the layer would cover the text. */}
      {running && createPortal(<div id="fx" aria-hidden="true" ref={attach} />, document.body)}
      <div className="fx-bar">
        <button type="button" className="fx-toggle" aria-pressed={running} disabled={state === 'pending'}
          onClick={() => writeChoice(running ? 'off' : 'on')}>
          bg: {state === 'pending' ? '--' : running ? 'on' : 'off'}
        </button>
        <span className="fx-stats" aria-live="off">
          <span>fps <b>{stats ? stats.fps : '--'}</b></span>
          <span>ms <b>{stats ? stats.ms.toFixed(1) : '--'}</b></span>
          <span>n <b>{stats?.count ? stats.count.toLocaleString() : '--'}</b></span>
        </span>
      </div>
    </>
  );
}
