import Link from 'next/link';
import './docs.css';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs">
      <header className="docs-top">
        <Link href="/" className="brand">MOUSEFX<span className="cursor">_</span></Link>
        <nav>
          <Link href="/docs">docs</Link>
          <Link href="/docs/architecture">architecture</Link>
          <Link href="/">showcase</Link>
        </nav>
      </header>
      <main className="docs-main">{children}</main>
    </div>
  );
}
