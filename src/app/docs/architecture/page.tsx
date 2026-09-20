import type { Metadata } from 'next';
import Link from 'next/link';
import Content from '@/content/docs/architecture.mdx';

export const metadata: Metadata = {
  title: 'Architecture — the shared runtime // MOUSEFX',
  description: 'The effect contract, the shared pointer, the frame loop, teardown, and how to embed one effect.',
};

const TOC = [
  ['contract', 'Effect contract'],
  ['pointer', 'Shared pointer'],
  ['frame-loop', 'Frame loop'],
  ['loading', 'Selection and on-demand loading'],
  ['resize', 'Resize and pixel ratio'],
  ['reduced-motion', 'Reduced motion'],
  ['teardown', 'Teardown'],
  ['modes', 'Showcase mode and fixed-effect mode'],
  ['embedding', 'Embed one effect'],
] as const;

// No background effect on this page: it is about the runtime, not about one effect.
export default function ArchitecturePage() {
  return (
    <article className="doc">
      <header className="doc-head">
        <p className="doc-kicker"><Link href="/docs">docs</Link> / architecture</p>
        <h1>ARCHITECTURE</h1>
        <p className="doc-tech">the shared runtime</p>
        <p className="doc-lede">
          Each effect is a small module with four functions. The runtime gives it a container, one shared
          pointer, and a stable frame loop, and it releases all resources when the effect or the page goes away.
        </p>
      </header>

      <nav className="doc-toc" aria-label="On this page">
        <ol>{TOC.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}</ol>
      </nav>

      <Content />

      <nav className="doc-nav" aria-label="Docs pages">
        <Link href="/docs">← index</Link>
        <Link href="/">open the showcase</Link>
        <Link href="/docs/gravity-well">gravity-well →</Link>
      </nav>
    </article>
  );
}
