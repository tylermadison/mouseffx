# Tasks

## 1. Fluid burst ring

- [ ] 1.1 In `src/lib/mousefx/effects/fluid.js`, add `BURST_RADIUS: 0.03` to `this.cfg`. In the burst loop of the `doc:input` region, put each splat at `nx + Math.cos(a) * R / aspect, ny + Math.sin(a) * R` (design Decision 1), with `aspect = this.canvas.width / this.canvas.height`. Change the comment to agree (a ring of splats, each offset along its direction). Do not change the count, the velocity, the colour, or the radius scale. Verify: `pnpm lint` passes and `git diff --stat` shows only `fluid.js`
- [ ] 1.2 Measure the burst in the browser with the method of design.md (Context, Measurement): in the showcase with `#fluid`, use `window.mousefx.current`, set velocity, pressure, and dye to zero, set `pointer.down` for a press at the centre (or call the burst code path through `update` with a press edge), step `update(1/60)` 30 times, and read the dye texture. Verify: the dye radius growth after 30 frames is 0.08 of the canvas height or more (spec scenario "Burst dye moves outward"). Write the values in the task notes
- [ ] 1.3 Do the measurement of 1.2 again with a 16:9 window (for example 1456 × 819). If the growth is below 0.08, increase `BURST_RADIUS` in the range 0.03 to 0.06. If 0.06 is not sufficient, apply the `√aspect` fallback of design Decision 2. Verify: the growth is 0.08 or more at 16:9 and at a portrait aspect ratio, and the final value is in the task notes
- [ ] 1.4 Check the burst with the real mouse in the showcase: press with no movement, press during a stroke, hold for 2 s, release and press again. Verify: each press gives one outward burst with palette colours, a held button with no movement adds no dye (spec scenarios "One burst for each press" and "Second press"), the frame rate stays at the value before the change, and the console has no errors

## 2. Orbits text

- [ ] 2.1 In `src/lib/mousefx/catalogue.ts`, change the last sentence of the `orbits` `desc` to "Press to go nova, hold to repel." In `src/lib/mousefx/effects/orbits.js`, change line 3 of the header comment to "Press the button to go nova, hold it to repel." Verify: `grep -rn -i "hold.*nova" src README.md` has no output, and `git diff` of `orbits.js` shows the comment line only
- [ ] 2.2 Open the showcase with `#orbits` and the docs index `/docs`. Verify: the hero description and the index entry show the new text. Press and hold the button for 3 s, then release. Verify the three scenarios of "Orbits press and hold": one white ring at the press, amber core and repulsion during the hold, cyan core and attraction after the release

## 3. Docs and README text

- [ ] 3.1 In `src/content/docs/fluid.mdx`, rewrite the four places of design Decision 4: the "Press edge" item of Interaction, the "Press burst" step of the Frame pipeline, the last sentence of "Pointer input" in Code, and a new `Param` (`name="burst ring radius"`, `literal="BURST_RADIUS: 0.03"` or the final value from 1.3) in Tuned constants. Use the measured values from 1.2 and 1.3, not the values of design.md, where the page gives numbers. Write in the style of the page (ASD-STE100). Verify: `pnpm check:docs` passes, and `grep -n -i "cancel\|add to zero\|white flash" src/content/docs/fluid.mdx` has no output
- [ ] 3.2 If the Performance section of `fluid.mdx` or its pass count text gives the number of draws of the burst, check that it is still correct (14 splats, two draws each; the count does not change). Verify: a note in the task notes with "no change" or the corrected line
- [ ] 3.3 In `README.md`, change the `fluid` row of the effect table from "Hold → burst ring." to "Press → burst ring, hold → wider splats." Check that the `orbits` row still reads "Press → nova shockwave, hold → repulsor." Verify: spec scenario "README effect table" by inspection

## 4. Final checks

- [ ] 4.1 Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Verify: all three have exit code 0
- [ ] 4.2 Open `/docs/fluid` from the build. Verify: the `input` excerpt shows the new burst loop, the new `Param` row is in the constants table, the Interaction text agrees with spec scenario "Fluid docs describe the burst", and the burst works in the live background of the page
- [ ] 4.3 Run `openspec validate fix-fluid-burst-and-orbits-text --strict`. Verify: no errors
