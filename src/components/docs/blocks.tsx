import { SECTIONS, type SectionId } from './sections';

// One of the eight fixed sections. `title` is only for pages with other sections (architecture).
export function Section({ id, title, children }: { id: SectionId | string; title?: string; children: React.ReactNode }) {
  const heading = title ?? SECTIONS.find((s) => s.id === id)?.title ?? id;
  return (
    <section id={id} className="doc-section">
      <h2><a href={`#${id}`} className="doc-anchor" aria-label={`Link to ${heading}`}>#</a> {heading}</h2>
      {children}
    </section>
  );
}

// Formula as monospace text. Pass the text as a string expression so that MDX
// does not read `*` and `_` as Markdown: <Formula>{`a = GM / (r² + ε²)`}</Formula>
export function Formula({ caption, children }: { caption?: string; children: string }) {
  return (
    <figure className="formula">
      <pre>{children}</pre>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// The steps of one frame, in order.
export function Pipeline({ children }: { children: React.ReactNode }) {
  return <ol className="pipeline">{children}</ol>;
}

export function Step({ title, reads, writes, children }: { title: string; reads?: string; writes?: string; children?: React.ReactNode }) {
  return (
    <li className="step">
      <div className="step-head">
        <span className="step-title">{title}</span>
        {reads && <span className="step-io">reads <b>{reads}</b></span>}
        {writes && <span className="step-io">writes <b>{writes}</b></span>}
      </div>
      {children && <div className="step-body">{children}</div>}
    </li>
  );
}

// Tuned constants. `literal` is the exact text in the source; check-docs fails if it is not there.
export function ParamTable({ children }: { children: React.ReactNode }) {
  return <div className="params">{children}</div>;
}

export function Param({ name, literal, controls, why }: { name: string; literal: string; file?: string; controls: string; why: string }) {
  return (
    <div className="param">
      <div className="param-head"><span className="param-name">{name}</span><code>{literal}</code></div>
      <dl>
        <dt>controls</dt><dd>{controls}</dd>
        <dt>why</dt><dd>{why}</dd>
      </dl>
    </div>
  );
}

// Text in `backticks` becomes <code>. MDX has no table syntax without a plugin, so tables are data.
function cell(text: string) {
  return text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

export function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{cell(h)}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{cell(c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// Measured values. The conditions are required: a number with no conditions has no meaning.
export function Measured({ conditions, head, rows }: { conditions: string; head: string[]; rows: string[][] }) {
  return (
    <figure className="measured">
      <Table head={head} rows={rows} />
      <figcaption>Conditions: {conditions}</figcaption>
    </figure>
  );
}
