import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export interface ExcerptResult {
  code: string;
  startLine: number;   // 1-based line of the first code line in the file
  endLine: number;
}

const MARKER = /^\s*\/\/ #(end)?region doc:([a-z0-9-]+)\s*$/;
const ROOT = path.join(process.cwd(), 'src', 'lib', 'mousefx');

// Returns the code between `// #region doc:<region>` and its `// #endregion`
// in a file below src/lib/mousefx. Runs during the build, so a missing region
// fails the build instead of showing stale code.
export function readExcerpt(file: string, region: string, usedBy: string): ExcerptResult {
  const fail = (why: string) => new Error(`Docs excerpt not found: ${file}#${region} (used by ${usedBy}): ${why}`);
  const abs = path.join(ROOT, file);
  if (!abs.startsWith(ROOT + path.sep) || !fs.existsSync(abs)) throw fail('no such file');
  const lines = fs.readFileSync(abs, 'utf8').split('\n');

  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = MARKER.exec(lines[i]);
    if (!m || m[2] !== region) continue;
    if (!m[1]) { if (start !== -1) throw fail('region starts two times'); start = i; }
    else { if (start === -1) throw fail('#endregion before #region'); end = i; break; }
  }
  if (start === -1) throw fail('no #region marker');
  if (end === -1) throw fail('no #endregion marker');

  // Drop the markers of nested regions, then remove the common indent.
  const body = lines.slice(start + 1, end).filter((l) => !MARKER.test(l));
  const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const code = body.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n').replace(/\s+$/, '');
  if (!code) throw fail('region is empty');
  return { code, startLine: start + 2, endLine: end };
}
