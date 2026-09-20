# Design

## Context

See `proposal.md` for the motivation. These facts from the current code shape the approach:

- The app has one route, `/`. `src/app/page.tsx` renders the showcase inside `MouseFxProvider`. The header links `docs`, `lab`, and `about` go to `#`.
- `src/app/globals.css` sets `html, body { height: 100%; overflow: hidden }`, `body { cursor: crosshair }`, and `#site { user-select: none; pointer-events: none }`. These rules are correct for the showcase and wrong for a document.
- `createController()` always adds the key handler and the `hashchange` handler, writes `location.hash`, calls `preventDefault` on `Space`, and sets `window.mousefx`. A docs page needs none of these. On a docs page, the hash is a heading anchor. With the current controller, `#model` is an unknown effect id and selects `gravity-well`.
- The controller is bound to the `#fx` node through a ref callback in `MouseFx.tsx`. Mount, unmount, and Fast Refresh are safe (archived change `migrate-to-nextjs`, Decision 4).
- `registry.ts` holds the effect metadata and the `load` functions in one array. A server component that needs only the titles also pulls the `import()` references.
- The eight effect modules (98 to 305 lines) are dense JavaScript with GLSL in template strings. 30 lines are longer than 160 characters. They have no region markers. Each has a header comment that names its techniques.
- Facts that the docs content starts from (the writer must confirm each one in the source): `gravityWell.js` has the shader constants `NOISE`, `VEL_FS`, `POS_FS`, `PT_VS`, `PT_FS`, `FADE_FS`, `COPY_FS`, `INIT_FS`. `fluid.js` has the passes `clear, splat, advect, divergence, curl, vorticity, pressure, gradient, display` and `cfg = { SIM: 160, DYE: 1024, ITERS: 20, CURL: 28, DYE_DISS: 0.9, VEL_DISS: 0.25 }`. `matrixRain.js` uses `R = 170, k = 55, damp = 7`. `orbits.js` uses `GM = 2.2e6, soft = 900, sub = 2`. `tendrils.js` runs 4 constraint iterations and has a pool of 900 sparks. `nebula.js` uses a two-level domain warp (`w1`, `w2`) of `fbm` and limits its internal width. `asciiField.js` has `vnoise` and the glyph sets `DIR`, `HOT`, `HEX`. `warp.js` has `D = 40.0`, `LINE_VS`, `POINT_VS`, `COMP_FS`.
- The MDX guide in the installed Next.js 16.3.5 package confirms that `@next/mdx` works with Turbopack. remark and rehype plugins work only with serializable options.
- The project has no test runner. Verification in the last change used build, lint, type check, `curl`, and browser checks.

## Goals / Non-Goals

**Goals:**

- The docs describe the code that runs. Excerpts and quoted constants come from the source, and the build fails when they do not match.
- The docs pages add no cost to the showcase route, and highlight adds no client JavaScript.
- Prose is easy to write and to review: Markdown with a small set of components.
- The showcase appearance and behaviour do not change, apart from the two new links.

**Non-Goals:**

- A reformat of the effect modules for readability. Only marker comments are added.
- Math typesetting (KaTeX or MathJax). Formulas are monospace text, which agrees with the terminal style.
- Search, versioned docs, translations, a sitemap, or content for the `lab` and `about` links.
- A test runner. A small Node check script is sufficient for the docs rules.
- Interactive parameter controls on the docs pages. This is a possible later change.

## Decisions

### 1. Routes and static generation

```
src/app/docs/
  layout.tsx            # docs shell: header (brand → /, docs index, showcase), imports docs.css
  page.tsx              # index
  architecture/page.tsx # static segment, wins over [effect]
  [effect]/page.tsx     # generateStaticParams from the catalogue, dynamicParams = false
```

`dynamicParams = false` gives the 404 for an unknown id with no code. `generateMetadata` sets the title from the catalogue (`NEBULA — how it works // MOUSEFX`). All docs pages are static.

### 2. Split `registry.ts` into catalogue data and loaders

New `catalogue.ts` holds the plain data (`id`, `key`, `name`, `title`, `tech`, `desc`, and the source file name). `registry.ts` maps the catalogue and adds `load`. Server components import `catalogue.ts` only. The `EffectDef` type and the `registry` export do not change, so the controller and the showcase do not change.

*Alternative:* import `registry.ts` on the server. It works, but it puts the effect `import()` references in the server graph of the docs pages for no reason.

### 3. Content in MDX with no plugins

Add `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`. `next.config.ts` wraps the config with `createMDX()` and sets `pageExtensions: ['ts', 'tsx', 'md', 'mdx']`. A root `src/mdx-components.tsx` maps Markdown elements to styled elements and registers the docs components.

Content files are in `src/content/docs/<effect-id>.mdx` and `src/content/docs/architecture.mdx`. The route loads them with `await import(`@/content/docs/${effect}.mdx`)`, which the MDX guide documents for dynamic segments.

No remark or rehype plugins are used, so the Turbopack limit on plugin options does not apply. The jobs that plugins usually do are done by components: `Excerpt` for highlight, `Section` for heading anchors.

*Alternative:* TSX content files. Rejected: long prose in JSX needs entity escapes for quotes and braces, and reviews of text changes become hard. *Alternative:* a Markdown library that parses files at run time (`next-mdx-remote`, `marked`). Rejected: more moving parts than the official integration, with no benefit for nine local files.

### 4. Docs components

All are server components unless noted.

| Component | Job |
|---|---|
| `DocShell` | Page frame for an effect: title, technology label, table of contents, previous / next / index / showcase links, and the `FxBackground`. |
| `Section id` | `<section>` with an `<h2 id>` and an anchor link. The eight ids are fixed (`overview` … `references`). |
| `Formula` | Monospace formula block with an optional caption. Plain text, so it is readable with no script. |
| `Pipeline` / `Step` | Ordered list of frame steps. Each step has `reads` and `writes` labels for buffers. |
| `Excerpt file region lang` | Code from the real source (Decision 5). |
| `ParamTable` / `Param name literal controls why` | Tuned constants (Decision 6). Shown as a list of cards, not a table: the source text of a constant is often long, and a four-column table pushed the explanation out of view. |
| `Measured` | Performance table with the measurement conditions as a required prop. |
| `FxBackground effectId` (client) | Live background, statistics strip, and the stop / start control (Decision 7). |

### 5. Excerpts by region markers, read at build time

Marker format, on its own line:

```js
// #region doc:velocity-update
…code…
// #endregion doc:velocity-update
```

`src/lib/docs/excerpt.ts` (server only, `import 'server-only'`) reads the file below `src/lib/mousefx/` with `fs.readFileSync(path.join(process.cwd(), …))`, returns the lines between the two markers, removes marker lines of nested regions, removes the common indent, and returns the first line number. If the region is missing, or a marker has no partner, it throws `Docs excerpt not found: <file>#<region> (used by <page>)`. Static generation runs this during `next build`, so the build fails.

`Excerpt` is an async server component. It highlights with `shiki` (`codeToHtml`) for `js`, `ts`, and `glsl`, with the shiki CSS-variables theme so that colours come from the tokens in `docs.css`. The output is static HTML. The component shows the file path and the line range, and a link to the file on GitHub.

Marker placement rule: markers go outside template strings when the excerpt is a full declaration (for example all of `VEL_FS`). A marker goes inside a GLSL template string only when the excerpt is a part of a long shader. There it is a valid GLSL line comment on its own line, so the compiled shader does not change.

Long lines: the effect source has lines of 200 characters and more. Code blocks use `white-space: pre-wrap` so that the page does not scroll sideways. Copy gives the real text. The prose next to each excerpt carries the explanation. The source is not reformatted (Non-Goal).

*Alternative:* line ranges (`lines="77-95"`). Rejected: each edit above the range moves it, and the failure is silent. *Alternative:* copy the code into the MDX files. Rejected: it is the drift that the proposal wants to prevent.

### 6. Constants are checked against the source

Each `Param` has a required `literal` prop with the exact text from the source, for example `literal="soft = 900"` or `literal="ITERS: 20"`. `scripts/check-docs.mjs` (plain Node, no dependency) does three checks for each effect MDX file:

1. The eight `<Section id="…">` elements are present, one time each, in the specified order.
2. Each `literal` string occurs in the source file of that effect.
3. Each `<Excerpt>` names a region that exists (the same rule as Decision 5, so that the error comes early and lists all problems together).

`package.json` runs it before the build: `"build": "node scripts/check-docs.mjs && next build"`, and a `check:docs` script runs it alone. A host that runs `pnpm build` gets the same guard.

### 7. Fixed-effect mode in the controller

`ControllerOptions` gets `mode?: 'showcase' | 'fixed'` (default `'showcase'`) and `effectId?: string`. In `fixed` mode the controller does not add the `keydown` and `hashchange` listeners, does not write `location.hash`, does not set `window.mousefx`, and selects `effectId` one time. The pointer, the frame loop, the visibility pause, the resize handler, the statistics callback, and `destroy()` are the same code path. `select` and `next` stay on the returned object but have no effect in `fixed` mode.

`FxBackground` uses the same ref-callback pattern as `FxLayer`: the controller lifetime is the lifetime of its `#fx` node. The node is rendered into `document.body` with a portal. Found during implementation: `backdrop-filter` on the content panel makes the panel the containing block for `position: fixed` children, so a layer inside the panel covered the text and not the viewport. Stop unmounts the node, which runs `destroy()` and releases the graphics context. Start mounts it again.

Background state: `'pending' | 'running' | 'stopped'`. The server and the first client render use `'pending'` (no canvas, control shows a neutral label). After mount, the component reads `sessionStorage` (the visitor's last choice) and `matchMedia('(prefers-reduced-motion: reduce)')`, and then sets `'running'` or `'stopped'`. This prevents a hydration mismatch and gives the reduced-motion default. Storage access is in `try / catch`.

The control is a `<button aria-pressed>` with the text `bg: on` / `bg: off`.

*Alternative:* a second, smaller runtime for the docs. Rejected: two frame loops and two teardown paths to keep correct. The Fast Refresh defect in the last change showed the cost of that.

### 8. Scope the showcase styles

`page.tsx` wraps the showcase in `<div className="showcase">`. In `globals.css`:

- `html, body` keep `margin`, `background`, `color`, and `font-family`. `height: 100%` and `overflow: hidden` move to `.showcase { position: fixed; inset: 0; overflow: hidden; cursor: crosshair; }`.
- `#site { min-height: 100% }` now resolves against `.showcase`, so the hero stays centred.
- `#fx`, `#fx canvas`, tokens, `kbd`, and `.cursor` stay global, because the docs use them too.
- Docs rules are in `src/app/docs/docs.css`, all below a `.docs` class on the docs shell. A style sheet that a layout imports stays loaded after client navigation, so each file must scope its rules by class.

### 9. Readable text above a moving background

The content column has `max-width: 78ch` and a backdrop of `rgba(5, 5, 8, 0.88)` with `backdrop-filter: blur(10px)`. Worst case is pure white behind the panel: the blend is about `#232325`, and body text `#c8ffd4` has a contrast of about 12:1. The current `--dim` (`#5f7f68`) has about 3.4:1 on that blend, which is below 4.5:1. The docs define `--docs-dim: #8fb09a` (about 6.5:1) for secondary text and do not use `--dim` for text. A task computes these values again for the final colours.

Code blocks and tables have an opaque background (`#07090a`), so highlight colours do not depend on the effect behind them.

### 10. Links from the showcase

`HeroText` (client) renders `<Link href={`/docs/${activeDef.id}`}>` with the text `→ how it works` below the description. It is inside `#site`, so the `h` toggle hides it, and the rule `#site a { pointer-events: auto }` makes it clickable. The header `docs` link becomes `<Link href="/docs">`. `lab` and `about` do not change.

Client navigation from `/` to `/docs/…` unmounts `MouseFxProvider`, which destroys the showcase controller. The link back is `/#<id>`. The showcase controller reads the hash when it starts, which is current behaviour.

### 11. Content method

For each effect the writer reads the full module first, then adds the region markers, then writes the page. Rules:

- Each statement about behaviour must be traceable to a line in the module. Where the header comment and the code differ, the code is correct.
- Formulas use the variable names from the source where possible, with the source constant next to the symbol (for example `ε² = soft = 900`).
- The Performance section reuses the measured values from `README.md` and from the task notes of the archived change `2026-09-19-migrate-to-nextjs` (viewport 1710×930, dpr 2). Each table states its conditions. No new numbers are invented.
- References come from the README research list, plus the primary source of each technique when the module names it (for example Stam's "Stable Fluids" for `fluid`). Each link is opened one time to confirm that it is live.

## Risks / Trade-offs

- [MDX with Next.js 16.3.5 and Turbopack fails in a way that the guide does not cover, or an async server component inside MDX does not render] → Task group 1 proves the full chain (MDX page, `Excerpt` with shiki, static build) with one stub page before other work starts. If it fails, the work stops and the user decides on the fallback (TSX content with the same components).
- [Marker comments inside a GLSL string change the shader text] → The placement rule in Decision 5 keeps most markers outside strings. A task checks that the diff of the effect directory has only added marker lines, and compares all eight effects in the browser with the production site before the change.
- [The style scope change moves the showcase layout] → The showcase scenarios and a visual comparison run again after group 2, before docs work builds on it.
- [Docs text goes out of date when an effect is tuned later] → Excerpts update by themselves. Changed constants fail `check-docs`. Prose can still drift. The check script cannot detect that, so the README tells contributors to read the docs page when they change a module.
- [Long lines wrap in code blocks and are harder to read] → Accepted. The alternative is a reformat of tuned modules, which is a separate change.
- [A live WebGL background costs battery while a visitor reads] → The stop control, the reduced-motion default, the existing pause when the tab is hidden, and no background on the index and architecture pages.
- [`fs` reads at build time on the host] → The files are in the repository and the pages are static, so the reads occur only during `next build`. No run-time file access is necessary.
- [`shiki` increases install and build time] → It is a development-time cost only. No shiki code goes to the client.

## Migration Plan

1. Group 1 proves the MDX and excerpt chain. Group 2 scopes the styles. Group 3 adds the fixed-effect mode. Each group leaves the showcase in a working state, and each can be reverted alone with git.
2. Content pages come one for each task, so that a partial delivery is possible: `dynamicParams = false` and the check script need all eight files, so the stub pages from group 4 stay until their content replaces them.
3. Rollback: revert the commits of this change. No data and no external system is involved.

## Open Questions

- Add interactive parameter controls to the docs pages later? It does not change this design, because `Param` already holds the name and the literal.
