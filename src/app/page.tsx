import { FxLayer, HeroText, Hud, MouseFxProvider, Site } from '@/components/MouseFx';

export default function Page() {
  return (
    <MouseFxProvider>
      <FxLayer />

      <Site>
        <header className="top">
          <span className="brand">MOUSEFX<span className="cursor">_</span></span>
          <nav>
            <a href="#" className="lnk">docs</a>
            <a href="#" className="lnk">lab</a>
            <a href="#" className="lnk">about</a>
          </nav>
        </header>

        <section className="hero">
          <p className="kicker">{'// physics-based mouse followers'}</p>
          <HeroText />
          <p className="hint">move the mouse &nbsp;·&nbsp; hold to disturb &nbsp;·&nbsp; keys <kbd>1</kbd>–<kbd>8</kbd> switch &nbsp;·&nbsp; <kbd>space</kbd> next &nbsp;·&nbsp; <kbd>h</kbd> hide ui</p>
        </section>
      </Site>

      <Hud />
    </MouseFxProvider>
  );
}
