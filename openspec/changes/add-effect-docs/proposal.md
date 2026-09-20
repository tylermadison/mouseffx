# Proposal

## Why

The showcase shows eight effects, but it does not explain them. The only description of the techniques is one table row for each effect in `README.md` and a short comment at the top of each module. A visitor who wants to learn how an effect works must read dense source code with one-line shaders. The `docs` link in the header goes to `#`. The project now has a Next.js app that can hold more routes, so this is the correct time to add the docs.

## What Changes

- Add a docs section to the site: an index at `/docs`, one deep-dive page for each of the eight effects at `/docs/<effect-id>`, and one page at `/docs/architecture` for the shared runtime (effect contract, pointer, frame loop, embedding).
- Give each effect page the same structure: overview, interaction, model (physics or math, with formulas), frame pipeline, code excerpts, tuned constants with the reason for each value, performance, and references.
- Take the code excerpts from the real effect modules at build time, by named region markers. A missing region fails the build, so the docs cannot show code that is no longer in the source.
- Add region marker comments to the eight effect modules. These are comment lines only. No statement, shader, or constant changes.
- Run the documented effect as a live background behind each effect page, in a new fixed-effect mode of the runtime. This mode takes no keys, does not read or write the URL hash, and does not expose `window.mousefx`. The visitor can stop and start the background. With `prefers-reduced-motion: reduce`, the background starts in the stopped state.
- Make the docs pages normal documents: they scroll, the text can be selected, `Space` scrolls, and heading anchors (`#model`) work.
- Link the showcase to the docs: the header `docs` link opens `/docs`, and a new "how it works" link in the hero opens the page of the active effect. Each effect page links back to the showcase with that effect selected (`/#<effect-id>`).
- Scope the showcase-only styles (`overflow: hidden`, `cursor: crosshair`, `user-select: none`, fixed full-viewport layout) to the showcase, because they are global at this time and they prevent a page that scrolls.
- Add MDX support (`@next/mdx`) for the docs content and `shiki` for build-time syntax highlight of JavaScript and GLSL. The two add no client JavaScript for highlight.
- Update `README.md` with a link to the docs and the location of the content files.

No breaking changes. The showcase keeps all behaviour in the `effect-showcase` and `effect-runtime` specs.

## Capabilities

### New Capabilities

- `effect-docs`: The docs section. The index, the effect pages and their required structure, the architecture page, code excerpts from the real source, the live background with its stop control, document behaviour (scroll, selection, anchors, no key capture), navigation between docs and showcase, and delivery of the text in the initial HTML.

### Modified Capabilities

- `effect-runtime`: One ADDED requirement for a fixed-effect mode: the runtime hosts one given effect with no selection input and no URL change. No current requirement changes.
- `effect-showcase`: One ADDED requirement for the links from the showcase to the docs. No current requirement changes.

## Impact

- **Code**: New routes below `src/app/docs/`. New content files below `src/content/docs/` (nine `.mdx` files). New docs components and a build-time excerpt library. `controller.ts` and `MouseFx.tsx` get the fixed-effect mode. `globals.css` and `page.tsx` change so that the showcase styles are scoped. The eight files in `src/lib/mousefx/effects/` get comment lines only.
- **Dependencies**: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`, and `shiki`. `next.config.ts` gets the MDX wrapper and `pageExtensions`. A root `mdx-components.tsx` file is necessary.
- **Specs**: New `effect-docs`. One added requirement each in `effect-runtime` and `effect-showcase`.
- **Build**: The docs pages are static (`generateStaticParams`). The excerpt library reads the effect source files during the build. The build fails if a docs page names a region that does not exist.
- **Risk to the showcase**: The style scope change touches the showcase layout, so the showcase scenarios and its appearance are checked again.
