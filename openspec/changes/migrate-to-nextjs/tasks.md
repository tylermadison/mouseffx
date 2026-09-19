# Tasks

## 1. Baseline and project setup

- [ ] 1.1 Ask the user to approve `git init` and a baseline commit of the current files. If the user declines, record that task 7.1 must make `legacy-backup/`. Verify: `git log --oneline` shows one commit, or the decision is written in this file
- [ ] 1.2 Add `.gitignore` with `node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `*.tsbuildinfo`, `.DS_Store`. Verify: the file exists with these entries
- [ ] 1.3 Add `package.json` (name `mousefx`, `private: true`, scripts `dev`, `build`, `start`, `lint`, `typecheck` = `tsc --noEmit`). Run `pnpm add next@latest react@latest react-dom@latest three@~0.160.0` and `pnpm add -D typescript @types/node @types/react @types/react-dom @types/three@~0.160.0 eslint eslint-config-next`. Verify: `pnpm install` has exit code 0 and `pnpm ls three` shows `0.160.x`
- [ ] 1.4 Add `tsconfig.json` (strict, `allowJs: true`, `checkJs: false`, `moduleResolution: bundler`, path alias `@/*` → `src/*`, Next.js plugin), `next.config.ts` (`reactStrictMode: true`), and `eslint.config.mjs` (`eslint-config-next` with `src/lib/mousefx/effects/**`, `js/**`, and `vendor/**` ignored). Verify: `pnpm lint` and `pnpm typecheck` have exit code 0 on the empty `src/` tree

## 2. Runtime library (`src/lib/mousefx`)

- [ ] 2.1 Add `types.ts` with `Pointer`, `EffectInit`, `Effect`, `EffectDef`, and `Stats`, taken from the fields in `js/pointer.js` and the contract in `README.md`. Verify: `pnpm typecheck` passes
- [ ] 2.2 Copy the eight files from `js/effects/` to `src/lib/mousefx/effects/` with no content change. Verify: `diff -r js/effects src/lib/mousefx/effects` has no output
- [ ] 2.3 Add `registry.ts` with the eight entries from `js/main.js` (same `id`, `key`, `name`, `title`, `tech`, `desc`, same order) and `load: () => import('./effects/<file>.js') as Promise<{ default: Effect }>`. No browser API at module scope. Verify: `pnpm typecheck` passes and the texts are the same as in `js/main.js` lines 3–20
- [ ] 2.4 Port `js/pointer.js` to `pointer.ts`. Keep the constants (idle 2500 ms, velocity limit 5000 px/s, smoothing rates 12 and 10, Lissajous terms). Register all listeners with one `AbortController` signal and add `dispose()`. Verify: `pnpm typecheck` passes, and a side-by-side read of the `update` function shows the same arithmetic
- [ ] 2.5 Add `controller.ts` with `createController({ container, onChange, onStats, onError, onToggleUi })`. Port from `js/main.js`: `select` (with the `loading` guard and the "already active" guard), `next(step)`, key handler (modifier check, `1`–`8`, `Space` / `ArrowRight` with `preventDefault`, `ArrowLeft`, `h`), `hashchange` handler, 60 ms resize debounce with the dpr limit of 2, visibility pause, `dt` limit of 0.05 s, statistics each 0.5 s, `location.hash = def.id`, and `window.mousefx`. Verify: `pnpm typecheck` passes
- [ ] 2.6 Add `destroy()` to the controller as in design Decision 7: `destroyed` flag, `cancelAnimationFrame`, `clearTimeout`, `AbortController.abort()`, `pointer.dispose()`, dispose of the current effect, empty container, `delete window.mousefx`. In `select()`, check `destroyed` after the `await` and return before `init`. Verify: code review against Decision 7, and task 5.2 passes

## 3. App shell and styles

- [ ] 3.1 Add `src/app/globals.css` with the content of `css/style.css`. Verify: `diff css/style.css src/app/globals.css` has no output
- [ ] 3.2 Add `src/app/layout.tsx` with `lang="en"`, metadata title `MOUSEFX // physics backgrounds`, the viewport default, and the `globals.css` import. Verify: `pnpm dev` serves `/` and the tab title is correct
- [ ] 3.3 Add `src/components/MouseFx.tsx` (`'use client'`) with `MouseFxProvider`, `FxLayer`, `Site`, `HeroText`, and `Hud` as in design Decision 4. The provider makes the controller in `useEffect` and returns `controller.destroy` as the cleanup. The initial `activeDef` is `registry[0]`. Keep the ids and class names from `index.html` (`fx`, `site`, `hud`, `fx-list`, `fx-title`, `fx-desc`, `hud-cmd`, `fps`, `ms`, `tech`, `count`, `hidden`, `active`). Verify: `pnpm typecheck` and `pnpm lint` pass
- [ ] 3.4 Add `src/app/page.tsx` as a server component with the markup from `index.html` lines 13–49: `aria-hidden` on the effect layer, header, nav, kicker, hint with `<kbd>` elements, and the two blinking cursors. Verify: `curl -s localhost:3000 | grep -c "GRAVITY WELL"` is 1 or more, and the HTML has `MOUSEFX` and `fx@localhost:~`

## 4. Behaviour parity checks (development server)

- [ ] 4.1 Run the old page (`python3 -m http.server 8787`) and the new page (`pnpm dev`) side by side. For each of the eight effects, compare the appearance, the pointer response, the hold-button mode, and the HUD count. Verify: a list of eight results in the task notes, each one "same" or with a recorded difference that is then corrected
- [ ] 4.2 Check the `effect-showcase` scenarios: keys `1`–`8`, `Space` and arrow keys with wrap, `Control`+`2` ignored, HUD click, `#fluid` deep link, unknown hash, hash change while open, display texts for `fluid`, `h` toggle, `window.mousefx.select('ascii')`. Verify: each scenario passes in the browser
- [ ] 4.3 Check the load error scenario: make one effect `init` throw temporarily. Verify: the hero description reads `error: <message>`, a different effect can then be selected, and the temporary change is removed (`diff -r js/effects src/lib/mousefx/effects` has no output)
- [ ] 4.4 Check the `effect-runtime` scenarios: autopilot after 3 s, tab hidden and shown, window resize, `?q=1024` count of 1,048,576, reduced motion through DevTools rendering emulation, a nav link receives a click. Verify: each scenario passes in the browser
- [ ] 4.5 Check on-demand loading: open `#matrix` with the DevTools network panel. Verify: no chunk for the other effects or for three.js loads before a second effect is selected

## 5. Teardown and Strict Mode

- [ ] 5.1 With `reactStrictMode: true` in `pnpm dev`, load the page. Verify: `document.querySelectorAll('#fx canvas').length` is the count for one effect (1, or 2 for `orbits`), and one key press moves the selection one step
- [ ] 5.2 Cycle through all eight effects three times, then edit `MouseFx.tsx` to cause a Fast Refresh. Verify: the console has no "too many active WebGL contexts" warning, one effect runs, and the fps value stays near the display rate

## 6. Production build and documents

- [ ] 6.1 Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Verify: all three have exit code 0 and the build output has no `window is not defined` or `document is not defined` error
- [ ] 6.2 Run `pnpm start` and repeat tasks 4.2 and 4.5 against the production build. Verify: the same results as in development
- [ ] 6.3 Compare the HUD `fps` and `ms` values of all eight effects with the table in `README.md`. Verify: no effect is more than 10% below its recorded fps on the same machine, or the difference is recorded with a cause
- [ ] 6.4 Update `README.md`: the Run section (`pnpm install`, `pnpm dev`, `pnpm build`), the file paths, and the "Use in a site" example (imports from `src/lib/mousefx`, `three` from npm, `pointer.dispose()`). Verify: each command and path in the README exists in the project

## 7. Remove the old page

- [ ] 7.1 If task 1.1 made no git commit, copy `index.html`, `css/`, `js/`, and `vendor/` to `legacy-backup/` and add it to `.gitignore` and to the ESLint ignore list. Verify: `diff -r` between the originals and the backup has no output
- [ ] 7.2 Delete `index.html`, `css/`, `js/`, and `vendor/`, and remove the `js/**` and `vendor/**` entries from the ESLint ignore list. Verify: `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass, and `grep -r "vendor/\|importmap" src README.md` has no output
