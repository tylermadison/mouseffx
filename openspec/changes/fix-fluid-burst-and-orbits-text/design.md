# Design

## Context

See proposal.md for the motivation.

**Fluid.** The burst is in the `doc:input` region of `src/lib/mousefx/effects/fluid.js`. On the press edge, a loop calls `splat(nx, ny, cos(a) · 2500, sin(a) · 2500, colour, 1.6)` 14 times with the same `nx, ny`. The `splat` shader adds `exp(−|p|² / r) · (dx, dy)` to the velocity texture. All 14 gaussians have the same centre, so the sum is `gaussian · Σ(cos a, sin a) = 0`. Only the dye adds.

The `splat` shader multiplies the x distance by the aspect ratio, so distances in the gaussian are in units of the canvas height. `splat` also multiplies `r` by the aspect ratio when the aspect ratio is more than 1.

A burst that points outward in all directions is almost a pure gradient field. The projection step (divergence, pressure, gradient) removes gradient fields, so the solver removes most of the burst velocity in a few frames. The question for this design was thus: does an outward ring move the dye a visible distance before the projection removes it?

**Measurement.** A test in the browser on the running effect gave the answer. The test used `window.mousefx.current`, set the velocity, pressure, and dye to zero, added the burst at the centre, and called `update(1/60)` directly. No file was changed. Grid 160 × 168, aspect ratio 0.96. "Dye radius" is the mean distance of the dye from the burst centre, weighted by brightness, in units of the canvas height.

| Burst | Max speed, frame 0 (texels/s) | Dye radius: frame 0 → 10 → 30 → 90 | Growth |
|---|---|---|---|
| Current: 14 splats, ring radius 0, radius scale 1.6 | 28 | 0.053 → 0.053 → 0.056 → 0.063 | 0.011 |
| Ring radius 0.03, radius scale 1.6 | 6,290 | 0.059 → 0.189 → 0.221 → 0.270 | 0.211 |
| Ring radius 0.06, radius scale 1.6 | 7,539 | 0.077 → 0.219 → 0.240 → 0.261 | 0.184 |
| Ring radius 0.04, radius scale 0.8 | — | 0.052 → 0.164 → 0.182 → 0.205 | 0.153 |
| Ring radius 0.06, radius scale 0.5 | 5,200 | 0.065 → 0.164 → 0.183 → 0.206 | 0.141 |
| 8 splats, ring radius 0.06, radius scale 0.5 | 3,039 | 0.065 → 0.151 → 0.169 → 0.198 | 0.133 |

The projection does remove most of the velocity: the mean outward speed goes from 421 texels/s on frame 0 to 53 after 3 frames and 4 after 15 frames (ring radius 0.03). But the dye moves 0.13 of the canvas height in the first 10 frames, which is a clear outward blast. A small ring radius with no other change is sufficient.

**Orbits.** The behaviour is correct and the README row is correct ("Press → nova shockwave, hold → repulsor"). Two texts are incorrect: the `desc` of `orbits` in `src/lib/mousefx/catalogue.ts` ("Hold to go nova.") and line 3 of the header comment in `orbits.js` ("Hold the button to go nova."). The docs page `orbits.mdx` already describes the press edge and the hold correctly.

## Goals / Non-Goals

**Goals:**
- The `fluid` burst moves the dye outward, with the smallest code change.
- All text about the two interactions agrees with the behaviour.
- `pnpm check:docs` stays green: each `Param` literal on the `fluid` page occurs in the source.

**Non-Goals:**
- No change to the solver passes, the splat shader, or the other `cfg` values.
- No change to the behaviour of `orbits`. "Hold to go nova" is not made true by a code change.
- No change to the showcase hint "hold to disturb". It is general text for all effects.
- No automatic test harness. The project has none, and the archived changes verify in the browser.

## Decisions

### Decision 1: Offset each burst splat along its own direction

In the burst loop, the splat position becomes `nx + cos(a) · R / aspect, ny + sin(a) · R`, with `aspect = canvas.width / canvas.height`. The division by `aspect` makes the ring round on the screen, because the shader measures x distances in units of the canvas height. The velocity, the colour, the count of 14, and the radius scale of 1.6 do not change.

Alternatives:
- *Make the splats smaller and the ring larger (separate jets).* Measured: less dye movement (0.14 against 0.21), and more values to change.
- *Add a tangential part to the velocity.* A swirl has no divergence, so the projection keeps it. But the result is a vortex, not a blast, and the description "burst ring" would be incorrect.
- *A special radial splat shader.* One draw, not 14, but a tenth program and more docs for a result that the offset already gives.

### Decision 2: The ring radius is a `cfg` value, start value 0.03

Add `BURST_RADIUS: 0.03` to `this.cfg`, in units of the canvas height. The other tuned values are in `cfg`, and the docs check needs a literal that occurs in the source (`BURST_RADIUS: 0.03`) for the new `Param` entry.

0.03 gave the largest dye movement in the measurement. The permitted range for the tune step is 0.03 to 0.06. On a 16:9 canvas `splat` makes the gaussian wider (`r · 1.78`), so the ratio of ring radius to gaussian width is smaller than in the measurement (0.38 against 0.5). The tune task measures again at 16:9 and increases the value in this range if the growth is below the spec limit. If the value changes, the `Param` literal and the docs text change with it.

Alternative: multiply the ring radius by `√aspect` to keep the ratio constant. Not used, because a fixed value in the range is sufficient if the 16:9 measurement passes. It stays the fallback if the measurement fails at 0.06.

### Decision 3: Correct the text, not the behaviour, of `orbits`

The press-edge nova and the hold repulsor are a good pair, the README and the docs page already describe them, and the docs page has measured values for them. New `desc`: "Your cursor is a star. Thousands of bodies slingshot around it, leaving light trails. Press to go nova, hold to repel." New header comment, line 3: "Press the button to go nova, hold it to repel."

The docs index and the showcase hero read `desc` from the catalogue, so one edit corrects the two pages.

### Decision 4: Rewrite the `fluid` docs text that describes the defect

Four places in `src/content/docs/fluid.mdx` describe the cancellation and must change:
1. Interaction, "Press edge": describe the ring (14 splats, ring radius, outward velocities, palette colours), that the projection removes most of the velocity in a few frames, and the measured dye movement. Remove the cancellation text and the "white flash" sentence.
2. Frame pipeline, step "Press burst": "14 splats on a ring around the cursor position."
3. Code, "Pointer input": replace the sentence "which is the reason that the velocities cancel" with an explanation of the offset and of the division by `aspect`.
4. Tuned constants: add a `Param` for the burst ring radius with its reason (0 cancels the velocities; a large value gives separate jets and less movement).

The `doc:input` region already contains the burst loop, so the excerpt on the page updates by itself. The README row for `fluid` changes from "Hold → burst ring." to "Press → burst ring, hold → wider splats."

## Risks / Trade-offs

- [The burst is weaker on a 16:9 canvas than in the measurement] → Task 1.3 measures at 16:9 against the spec limit, with a permitted range of 0.03 to 0.06 and the `√aspect` fallback.
- [The burst velocity of 6,290 texels/s on frame 0 is higher than one stroke splat (2,486)] → The vorticity pass clamps at ±1000 on the next frame, and the measurement showed no instability (speed 109 texels/s after 45 frames). Task 1.4 checks the appearance and the frame rate.
- [The centre of the burst is still almost white on frame 0, because the 14 gaussians overlap at ring radius 0.03] → Accepted. The flow moves the dye out in 10 frames, and the palette colours become visible as the ring expands. A larger ring radius in the permitted range decreases the overlap, if the look is not satisfactory in task 1.4.
- [A change of a source line inside a `doc:` region changes the excerpt on the docs page] → This is the intended behaviour. `pnpm check:docs` and `pnpm build` confirm that the region and the literals are still found.
