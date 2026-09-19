'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createController, type Controller } from '@/lib/mousefx/controller';
import { registry } from '@/lib/mousefx/registry';
import type { EffectDef, Stats } from '@/lib/mousefx/types';

interface MouseFxState {
  activeDef: EffectDef;
  stats: Stats | null;
  error: string | null;
  uiHidden: boolean;
  select(id: string): void;
  attach: React.RefCallback<HTMLDivElement>;
}

const MouseFxContext = createContext<MouseFxState | null>(null);

function useMouseFx() {
  const ctx = useContext(MouseFxContext);
  if (!ctx) throw new Error('MouseFx components must be inside <MouseFxProvider>');
  return ctx;
}

// Owns the showcase state and the controller. Server-rendered children pass through.
export function MouseFxProvider({ children }: { children: React.ReactNode }) {
  // The first render always shows the default effect so that the server HTML
  // and the first client render agree. The controller reads the URL hash after mount.
  const [activeDef, setActiveDef] = useState(registry[0]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uiHidden, setUiHidden] = useState(false);
  const controllerRef = useRef<Controller | null>(null);

  // Ref callback for the #fx node. The controller lives as long as that node:
  // if React replaces the node (Fast Refresh does), the old controller is
  // destroyed and a new one starts on the new node.
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const controller = createController({
      container: node,
      onChange: (def) => { setActiveDef(def); setError(null); },
      onStats: setStats,
      onError: setError,
      onToggleUi: () => setUiHidden((v) => !v),
    });
    controllerRef.current = controller;
    return () => {
      if (controllerRef.current === controller) controllerRef.current = null;
      controller.destroy();
    };
  }, []);

  const select = (id: string) => { controllerRef.current?.select(id); };

  return (
    <MouseFxContext.Provider value={{ activeDef, stats, error, uiHidden, select, attach }}>
      {children}
    </MouseFxContext.Provider>
  );
}

// Background layer. Effects mount their canvas here. pointer-events: none.
export function FxLayer() {
  const { attach } = useMouseFx();
  return <div id="fx" aria-hidden="true" ref={attach} />;
}

// Site content that sits above the background.
export function Site({ children }: { children: React.ReactNode }) {
  const { uiHidden } = useMouseFx();
  return <main id="site" className={uiHidden ? 'hidden' : undefined}>{children}</main>;
}

export function HeroText() {
  const { activeDef, error } = useMouseFx();
  return (
    <>
      <h1 id="fx-title">{activeDef.title}</h1>
      <p className="sub" id="fx-desc">{error ? `error: ${error}` : activeDef.desc}</p>
    </>
  );
}

// Terminal HUD
export function Hud() {
  const { activeDef, stats, uiHidden, select } = useMouseFx();
  return (
    <aside id="hud" className={uiHidden ? 'hidden' : undefined}>
      <div className="hud-head">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="hud-title">fx@localhost:~</span>
      </div>
      <ol id="fx-list">
        {registry.map((d) => (
          <li key={d.id} data-id={d.id} className={d.id === activeDef.id ? 'active' : undefined} onClick={() => select(d.id)}>
            <span className="k">{d.key}</span><span className="n">{d.name}</span><span className="t">{d.tech}</span>
          </li>
        ))}
      </ol>
      <div className="hud-stats">
        <span>fps <b id="fps">{stats ? stats.fps : '--'}</b></span>
        <span>ms <b id="ms">{stats ? stats.ms.toFixed(1) : '--'}</b></span>
        <span>tech <b id="tech">{activeDef.tech}</b></span>
        <span>n <b id="count">{stats?.count ? stats.count.toLocaleString() : '--'}</b></span>
      </div>
      <div className="hud-foot">$ <span id="hud-cmd">run {activeDef.name}</span><span className="cursor">▌</span></div>
    </aside>
  );
}
