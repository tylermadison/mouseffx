import { codeToHtml, createCssVariablesTheme } from 'shiki';
import { readExcerpt } from '@/lib/docs/excerpt';

const REPO = 'https://github.com/tylermadison/mouseffx/blob/main/src/lib/mousefx/';

// Colours come from the --shiki-* tokens in docs.css.
const theme = createCssVariablesTheme({ name: 'mousefx', variablePrefix: '--shiki-', fontStyle: true });

interface ExcerptProps {
  file: string;                  // path below src/lib/mousefx
  region: string;                // name in `// #region doc:<name>`
  lang?: 'js' | 'ts' | 'glsl';
  page?: string;                 // for the build error message
}

// Code from the real source, highlighted during the build. No client JavaScript.
export async function Excerpt({ file, region, lang = 'js', page = 'docs' }: ExcerptProps) {
  const { code, startLine, endLine } = readExcerpt(file, region, page);
  const html = await codeToHtml(code, { lang, theme });
  return (
    <figure className="excerpt">
      <figcaption>
        <a href={`${REPO}${file}#L${startLine}-L${endLine}`}>src/lib/mousefx/{file}</a>
        <span className="excerpt-lines">lines {startLine}–{endLine}</span>
      </figcaption>
      <div className="excerpt-code" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
