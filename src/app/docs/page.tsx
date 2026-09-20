import type { Metadata } from 'next';
import Link from 'next/link';
import { catalogue } from '@/lib/mousefx/catalogue';

export const metadata: Metadata = { title: 'Docs // MOUSEFX' };

export default function DocsIndex() {
  return (
    <article className="doc">
      <header className="doc-head">
        <p className="doc-kicker">docs</p>
        <h1>HOW IT WORKS</h1>
        <p className="doc-lede">
          Each page explains one effect: its model, its frame pipeline, its real code, and the reason
          for each tuned constant. The effect runs behind the page while you read.
        </p>
      </header>

      <ol className="doc-index">
        {catalogue.map((e) => (
          <li key={e.id}>
            <Link href={`/docs/${e.id}`}>
              <span className="k">{e.key}</span>
              <span className="n">{e.name}</span>
              <span className="t">{e.tech}</span>
              <span className="d">{e.desc}</span>
            </Link>
          </li>
        ))}
      </ol>

      <nav className="doc-nav" aria-label="More">
        <Link href="/docs/architecture">architecture: the shared runtime →</Link>
        <Link href="/">open the showcase</Link>
      </nav>
    </article>
  );
}
