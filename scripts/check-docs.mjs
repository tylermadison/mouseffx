// Checks the docs content against the effect source. Runs before `next build`.
//   1. Each effect page has the eight sections, one time each, in order.
//   2. Each <Param literal="…"> text occurs in the source file.
//   3. Each <Excerpt file region> names a region that exists.
// All problems are listed together. Exit code 1 if there is a problem.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SRC = path.join(root, 'src', 'lib', 'mousefx');
const CONTENT = path.join(root, 'src', 'content', 'docs');
const SECTIONS = ['overview', 'interaction', 'model', 'pipeline', 'code', 'constants', 'performance', 'references'];

// id → source file, from catalogue.ts
const catalogue = [...fs.readFileSync(path.join(SRC, 'catalogue.ts'), 'utf8').matchAll(/id: '([^']+)'.*?file: '([^']+)'/g)]
  .map((m) => ({ id: m[1], file: m[2] }));

const problems = [];
const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|\\{\`([^\`]*)\`\\})`).exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
// A tag ends at the first '>' that is not inside a quoted attribute value.
const tags = (mdx, name) => [...mdx.matchAll(new RegExp(`<${name}\\b(?:"[^"]*"|'[^']*'|\\{\`[^\`]*\`\\}|[^>"'])*>`, 'gs'))].map((m) => m[0]);
const source = (file) => { const p = path.join(SRC, file); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

function checkPage(page, defaultFile, needSections) {
  const mdxPath = path.join(CONTENT, `${page}.mdx`);
  if (!fs.existsSync(mdxPath)) { problems.push(`${page}: no content file src/content/docs/${page}.mdx`); return; }
  const mdx = fs.readFileSync(mdxPath, 'utf8');

  if (needSections) {
    const found = tags(mdx, 'Section').map((t) => attr(t, 'id'));
    if (found.join(',') !== SECTIONS.join(','))
      problems.push(`${page}: sections must be [${SECTIONS.join(', ')}] in this order, found [${found.join(', ')}]`);
  }
  for (const t of tags(mdx, 'Param')) {
    const literal = attr(t, 'literal'), file = attr(t, 'file') ?? defaultFile, name = attr(t, 'name');
    if (!literal) { problems.push(`${page}: <Param name="${name}"> has no literal`); continue; }
    const src = file && source(file);
    if (!src) problems.push(`${page}: <Param name="${name}"> has no source file (${file})`);
    else if (!src.includes(literal)) problems.push(`${page}: literal "${literal}" is not in ${file} (Param "${name}")`);
  }
  for (const t of tags(mdx, 'Excerpt')) {
    const file = attr(t, 'file'), region = attr(t, 'region');
    const src = file && source(file);
    if (!src) { problems.push(`${page}: <Excerpt> names a file that does not exist (${file})`); continue; }
    const open = src.split('\n').filter((l) => l.trim() === `// #region doc:${region}`).length;
    const close = src.split('\n').filter((l) => l.trim() === `// #endregion doc:${region}`).length;
    if (open !== 1 || close !== 1) problems.push(`${page}: region "${region}" must occur one time in ${file} (found ${open} #region, ${close} #endregion)`);
  }
}

if (catalogue.length !== 8) problems.push(`catalogue.ts: expected 8 effects, found ${catalogue.length}`);
for (const e of catalogue) checkPage(e.id, e.file, true);
if (fs.existsSync(path.join(CONTENT, 'architecture.mdx'))) checkPage('architecture', null, false);

if (problems.length) {
  console.error(`check-docs: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-docs: ok (${catalogue.length} effect pages)`);
