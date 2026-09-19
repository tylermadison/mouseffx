# Proposal

## Why

MOUSEFX is a static page: `index.html`, one style sheet, native ES modules, an import map, and a vendored copy of three.js r160. It has no package manifest, no build step, and no component model. Thus it is not easy to add pages, to share the effects with other React sites, or to deploy to a usual host. A move to a Next.js app gives the project a standard structure, dependency management, and code splitting, while the eight effects stay the same.

## What Changes

- Add a Next.js app (App Router, TypeScript, pnpm) at the project root: `package.json`, `next.config.ts`, `tsconfig.json`, ESLint configuration, and a `src/` tree.
- Move the page markup from `index.html` into `src/app/layout.tsx` and `src/app/page.tsx`. The server renders the static content. A client component mounts the effect layer and the HUD.
- Move `css/style.css` into `src/app/globals.css` with the same selectors and values.
- Move `js/main.js` logic into a typed controller with a full teardown function (listeners, animation frame, current effect). The current code has no teardown, because the page never unmounts.
- Move `js/pointer.js` into a typed module and add a `dispose()` function that removes its window listeners.
- Move the eight effect modules into `src/lib/mousefx/effects/` with no changes to their simulation or shader code. Lazy loading with dynamic `import()` stays.
- Replace the import map and `vendor/three.module.min.js` with the `three` npm package, pinned to `0.160.x`.
- Keep the observable behaviour of the page: keys `1`–`8`, `space`, arrow keys, `h`, URL hash selection, `?q=` particle quality, HUD statistics, pointer autopilot, pause when the tab is hidden, reduced motion, and the `window.mousefx` debug API.
- Update `README.md`: run commands, file paths, and the "Use in a site" example.
- **BREAKING**: Remove `index.html`, `css/`, `js/`, and `vendor/` after parity is verified. `python3 -m http.server` does not serve the page after this change. The module paths in the README embedding example change.

## Capabilities

### New Capabilities

The project has no specs at this time. This change records the current behaviour as the contract that the migration must keep.

- `effect-showcase`: The demo page. Effect selection (keys, HUD list, URL hash), the hero text, the HUD statistics, the UI hide toggle, error display, and the debug API.
- `effect-runtime`: The runtime that hosts one effect. Effect lifecycle, pointer tracking with autopilot, frame loop rules, resize, reduced motion, quality parameter, server render safety, and teardown.

### Modified Capabilities

None.

## Impact

- **Code**: All files in `js/`, `css/`, and `index.html` move or are replaced. `vendor/` is deleted. New tree below `src/`.
- **Dependencies**: New runtime dependencies `next`, `react`, `react-dom`, `three@0.160.x`. New development dependencies `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `@types/three`, `eslint`, `eslint-config-next`.
- **Tooling**: Node.js and pnpm are necessary to run the project. Commands change to `pnpm dev`, `pnpm build`, `pnpm start`.
- **Embedding API**: The effect contract (`init`, `update`, `resize`, `dispose`, `count`) does not change. The import paths change.
- **Repository state**: The directory is not a git repository. The removal of the old files is not reversible without a backup. The tasks keep the old files until parity is verified.
