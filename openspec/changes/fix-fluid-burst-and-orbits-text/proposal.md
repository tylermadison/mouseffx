# Proposal

## Why

The work on the effect docs found two defects that a visitor can see. In `fluid`, the press burst puts 14 splats with outward velocities at the same point, so the velocities add to zero: the visitor sees a white flash, not an outward blast. In `orbits`, the description in the showcase says "Hold to go nova", but the nova shockwave starts on the press and a held button makes the star a repulsor.

## What Changes

- `fluid`: put the 14 burst splats on a small ring around the cursor, each at the position that agrees with the direction of its velocity. The velocities then do not cancel, and the dye moves outward.
- `fluid` docs page and README: replace the text that describes the velocity cancellation with a description of the new burst. Add the ring radius to the tuned constants.
- `orbits`: correct the description in the catalogue (shown in the showcase hero and the docs) and the header comment of the module. The new text: "Press to go nova, hold to repel." The behaviour of `orbits` does not change.
- README effect table: the `fluid` row says "Hold → burst ring". Correct it to the press edge.
- Add a spec for the press and hold behaviour of these two effects, so that the text and the behaviour have one source of truth.

## Capabilities

### New Capabilities
- `effect-interaction`: the result of a button press and a held button for an effect, where a requirement is necessary. This change adds the `fluid` press burst, the `orbits` press and hold behaviour, and the rule that the catalogue description agrees with the behaviour.

### Modified Capabilities

None. `effect-showcase` shows the catalogue description but does not specify its text. `effect-docs` already requires that the Interaction section states the result of a held button; the corrected page text stays in that requirement.

## Impact

- `src/lib/mousefx/effects/fluid.js`: the burst loop in the `doc:input` region, and one new value in `cfg`.
- `src/lib/mousefx/effects/orbits.js`: header comment only.
- `src/lib/mousefx/catalogue.ts`: `desc` of `orbits`.
- `src/content/docs/fluid.mdx`: Interaction, Frame pipeline, Code, and Tuned constants sections.
- `README.md`: rows `fluid` and (check only) `orbits` of the effect table.
- No change to the runtime, the effect contract, the dependencies, or the other six effects.
