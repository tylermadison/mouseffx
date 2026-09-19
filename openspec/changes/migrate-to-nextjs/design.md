# Design

## Context

See `proposal.md` for the motivation. These are the facts from the current code that shape the approach:

- `index.html` (53 lines) holds static markup. `js/main.js` (123 lines) fills the HUD list with `innerHTML`, writes to elements by id, and owns the frame loop, the key handler, the hash handler, and the resize handler. It has no teardown.
- `js/pointer.js` adds five window listeners and never removes them. It reads `innerWidth` when `createPointer()` runs.
- The eight effects (about 1,350 lines) are singleton object literals that keep state on `this`. Each one makes its own canvas with `document.createElement` in `init`. None of them adds a global listener. The three WebGL/three.js effects release their context in `dispose()` (`forceContextLoss` / `WEBGL_lose_context`).
- `gravityWell.js` reads `location.search` for `?q=` in `init`.
- `gravityWell.js`, `nebula.js`, and `warp.js` import `three` through an import map that points to a vendored r160 build (670 KB).
- `matrixRain.js` and `asciiField.js` draw glyph atlases with the font stack `"JetBrains Mono", Menlo, Consolas, monospace`. The page does not load JetBrains Mono, so the fallback applies on most machines.
- The project has no `package.json`, no tests, and no git repository. Node 26, npm 11, pnpm, and bun are installed.

## Goals / Non-Goals

**Goals:**

- The Next.js page has the same appearance and behaviour as the current page (see the two specs).
- The effect modules move with the minimum of edits, so that the tuned physics and shaders do not change.
- The runtime is safe under React Strict Mode and Fast Refresh: mount, unmount, mount gives one effect, one loop, one set of listeners.
- Each effect stays in its own lazy chunk. The three.js code loads only for the three effects that use it.

**Non-Goals:**

- A TypeScript conversion of the effect internals.
- CSS Modules, Tailwind, or a restyle. The style sheet moves as it is.
- A web font, bloom passes, or other visual changes from the README "next steps".
- More routes, real content for the `docs` / `lab` / `about` links, or an npm package for the effects.
- An automated browser test suite. Verification uses build, lint, type check, and manual browser checks.

## Decisions

### 1. Next.js App Router, TypeScript, pnpm, files made by hand

The root gets `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `next-env.d.ts`, and `.gitignore`. Install with `pnpm add next@latest react@latest react-dom@latest three@~0.160.0` and the development packages.

`create-next-app` refuses to run in a directory that has `README.md` and `index.html`. A scaffold in a temporary directory and a copy step has more parts than six short files. *Alternative:* Pages Router. Rejected, because App Router is the default and the page needs no Pages Router feature. *Alternative:* Vite + React. Rejected, because the request names Next.js.

### 2. Source layout

```
src/
  app/
    layout.tsx        # <html>, <body>, metadata (title), imports globals.css
    page.tsx          # server component: static markup inside <MouseFxProvider>
    globals.css       # css/style.css, same content
  components/
    MouseFx.tsx       # 'use client'. Provider, FxLayer, Site, HeroText, Hud (Decision 4)
  lib/mousefx/
    types.ts          # Effect, EffectInit, EffectDef, Pointer, Stats
    registry.ts       # the eight EffectDef entries with load: () => import(...)
    pointer.ts        # createPointer() + dispose()
    controller.ts     # createController({ container, onChange, onStats, onError, onToggleUi })
    effects/*.js      # the eight effect modules, moved as they are
```

`old → new`: `index.html` → `layout.tsx` + `page.tsx` + `MouseFx.tsx`; `css/style.css` → `globals.css`; `js/main.js` → `registry.ts` + `controller.ts` + `MouseFx.tsx`; `js/pointer.js` → `pointer.ts`; `js/effects/*` → `lib/mousefx/effects/*`.

### 3. Imperative controller, thin React shell

`controller.ts` holds all logic from `main.js` that is not DOM text: `select`, `next`, the frame loop, the visibility pause, the debounced resize, the key handler, the hash handler, and `window.mousefx`. It reports to React through four callbacks: `onChange(def)`, `onStats({ fps, ms, count })`, `onError(message)`, and `onToggleUi()` for the `h` key. `MouseFx.tsx` keeps `activeDef`, `stats`, `error`, and `uiHidden` in state and renders the HUD list from `registry` as JSX.

The frame loop stays out of React. React state changes only on selection and two times per second for the statistics. *Alternative:* a `useEffect` for each concern (keys, hash, loop, resize). Rejected: the concerns share `current`, `loading`, and `dt`, and one `destroy()` is easier to make correct than six cleanup functions. *Alternative:* write statistics directly to the DOM through refs. Rejected: a 2 Hz render of four numbers has no measurable cost, and state keeps the component simple.

### 4. Hero text is rendered by the client component, with a server default

The hero title and description change with the effect, and the `h` toggle puts the `hidden` class on `#site`. But `#site` is static markup that the server renders. Decision: `MouseFx.tsx` exports five small client components that share one React context:

- `MouseFxProvider` owns the state (`activeDef`, `stats`, `error`, `uiHidden`) and supplies a ref callback that makes the controller. `page.tsx` wraps its content in it. Server-rendered children pass through it unchanged.
- `FxLayer` renders `<div id="fx">` with that ref callback. The callback makes the controller for the node and returns `controller.destroy` as its cleanup (React 19 ref cleanup). The controller lifetime is thus the lifetime of the container node.
- `Site` renders `<main id="site">` with the `hidden` class from the context. Its children (brand, nav, kicker, hint) stay server-rendered.
- `HeroText` renders the `<h1>` and the description (or `error: <message>`) from the context.
- `Hud` renders `<aside id="hud">` with the list, the statistics, and the command line.

The initial state is the `gravity-well` definition, so the server HTML has `GRAVITY WELL` and there is no hydration mismatch. The controller reads the hash after hydration. `registry.ts` has no browser API at module scope, so it is safe to import during the server render.

*Alternative (tried first, rejected):* make the controller in a `useEffect` of the provider with a ref object for the container. During implementation, a Fast Refresh replaced the `#fx` node but did not run the provider effect again. The controller then drew into a detached node and the background was blank. A ref callback binds the two lifetimes, so this condition cannot occur.

*Alternative:* let the controller write `textContent` by id as `main.js` does. Rejected: React can overwrite DOM text that it does not own, and the approach hides state from the component tree.

### 5. Effects stay JavaScript

`tsconfig.json` sets `allowJs: true` and `checkJs: false`. `registry.ts` casts each loaded module to `{ default: Effect }`. The only edit to the effect files is the move. The `import * as THREE from 'three'` lines stay valid, because the bundler resolves the bare specifier to the npm package.

The effects use `this` on object literals with properties that `init` adds later. Strict TypeScript rejects that pattern on almost every line. A conversion means a rewrite to classes, with a real risk to the tuned behaviour and no user value. *Alternative:* `// @ts-nocheck` in `.ts` files. Rejected: it gives a TypeScript file name with no type safety.

ESLint ignores `src/lib/mousefx/effects/**` so that the dense one-line style of those files does not fail the lint step.

### 6. `three` from npm, pinned to `~0.160.0`

The vendored file is r160. Later three.js releases changed colour management defaults and removed APIs. A pin keeps the visual result. `@types/three` uses the same minor version. `vendor/` and the import map are deleted. An upgrade of three.js is a separate change.

### 7. Teardown and the async race

`createController()` returns `destroy()`. It sets a `destroyed` flag, cancels the animation frame, clears the resize timer, aborts one `AbortController` that all `addEventListener` calls share, calls `pointer.dispose()`, disposes the current effect, empties the container, and deletes `window.mousefx`. `pointer.ts` uses the same `AbortController` pattern.

`select()` awaits a dynamic import. After the `await`, it checks `destroyed` and returns with no `init` call if the flag is set. Without this check, React Strict Mode gives two live effects in development: mount 1 starts the import, the cleanup runs, mount 2 starts, and then the import from mount 1 resolves and calls `init` into the same container.

The effects are module singletons. `init` → `dispose` → `init` on the same object is already the path that the current page uses when a visitor goes away from an effect and comes back, so it is a proven sequence.

### 8. Browser APIs only after mount

`createPointer()`, `matchMedia`, `innerWidth`, and `location` run only in the controller, and `MouseFx` makes the controller in a ref callback, which runs only in the browser. No `typeof window` guards are necessary, and no `next/dynamic` with `ssr: false` is necessary. `?q=` stays a direct `location.search` read in `gravityWell.js`. `useSearchParams` is not used, because it forces a Suspense boundary and the value is necessary only in the effect.

### 9. URL hash stays `location.hash`

`select()` sets `location.hash = def.id` as today. A hash change does not cause an App Router navigation. The `hashchange` handler calls `select()`, and the "already active" guard stops the loop. The browser history behaviour stays the same as the current page.

### 10. CSS moves with the same selectors

`globals.css` has the same content as `css/style.css`. The ids `#fx`, `#site`, `#hud`, `#fx-list` stay on the JSX elements. This gives pixel parity with no restyle. `html, body { overflow: hidden; height: 100% }` stays global. This is correct for a one-page app, and it is a point to look at again when a second route is added.

### 11. Old files stay until parity is verified

`index.html`, `css/`, `js/`, and `vendor/` do not conflict with `src/` or with Next.js (Next.js serves only `public/` and routes). They stay during the port as the reference for a side-by-side comparison (`python3 -m http.server 8787` next to `pnpm dev`). The last task group deletes them.

## Risks / Trade-offs

- [The directory is not a git repository, so a bad deletion is not reversible] → The first task asks the user to approve `git init` and a baseline commit. If the user declines, the deletion task first copies the old files to a `legacy-backup/` directory outside `src/`.
- [Strict Mode mounts two times and makes two WebGL contexts in quick sequence in development] → The three WebGL effects already release the context in `dispose()`. The `destroyed` check in Decision 7 stops the double `init`. A task verifies that the console shows no context warning.
- [The bundler changes module evaluation or minifies shader strings] → Shaders are template strings, which bundlers keep as they are. A task compares each effect with the old page.
- [`three@0.160` with the newest React / Next.js] → three.js has no React peer dependency, so there is no conflict. The pin is only for visual parity.
- [Type check of `.js` imports] → `checkJs: false` and an explicit cast in `registry.ts`. The `Effect` interface in `types.ts` is the contract.
- [Hydration mismatch if the hash is read during render] → The initial state is always `gravity-well`. The hash is read after mount. A visitor who opens `#fluid` sees `GRAVITY WELL` text for one frame before the change. This is the same as the current page, where the HTML also has `GRAVITY WELL` as its initial text.
- [Statistics in the HUD include React work] → `ms` measures only `current.update()`, as today. The fps counter counts frames in the controller loop, not React renders.

## Migration Plan

1. Add the Next.js app next to the old files. The old page continues to work through `python3 -m http.server`.
2. Port, then compare the two pages effect by effect.
3. Run `pnpm build` and `pnpm start`, and do the checks in the specs against the production build.
4. Update `README.md`.
5. Delete the old files (after the git baseline or the backup copy).

Rollback before step 5: delete `src/`, `node_modules/`, and the new config files. Rollback after step 5: restore from git or from `legacy-backup/`.

## Open Questions

- Static export (`output: 'export'`) or a Node server deployment? The page has no server logic, so the two options work and the choice changes only `next.config.ts`. The default in this design is no static export.
- Self-host JetBrains Mono with `next/font` in a later change? This changes the glyph atlas appearance, so it is out of scope here.
