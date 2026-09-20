import Link from 'next/link';
import type { EffectInfo } from '@/lib/mousefx/types';
import { FxBackground } from './FxBackground';
import { SECTIONS } from './sections';

interface DocShellProps {
  info: EffectInfo;
  prev: EffectInfo;
  next: EffectInfo;
  children: React.ReactNode;
}

// Page frame for one effect: title, live background, table of contents, and navigation.
export function DocShell({ info, prev, next, children }: DocShellProps) {
  return (
    <article className="doc">
      <header className="doc-head">
        <p className="doc-kicker"><Link href="/docs">docs</Link> / {info.name}</p>
        <h1>{info.title}</h1>
        <p className="doc-tech">{info.tech}</p>
        <p className="doc-lede">{info.desc}</p>
        <FxBackground effectId={info.id} />
      </header>

      <nav className="doc-toc" aria-label="On this page">
        <ol>
          {SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
        </ol>
      </nav>

      {children}

      <nav className="doc-nav" aria-label="Docs pages">
        <Link href={`/docs/${prev.id}`} rel="prev">← {prev.name}</Link>
        <Link href="/docs">index</Link>
        <Link href={`/#${info.id}`}>open in showcase</Link>
        <Link href={`/docs/${next.id}`} rel="next">{next.name} →</Link>
      </nav>
    </article>
  );
}
