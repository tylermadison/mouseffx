# Spec Delta

## Purpose

The effect showcase is the demo page. It lets a visitor select one of the eight background effects, shows the name and description of the active effect, and shows live performance statistics in a terminal-style HUD.

## ADDED Requirements

### Requirement: Effect catalogue
The showcase SHALL offer eight effects in this order, with these ids and keys: `gravity-well` (1), `fluid` (2), `matrix` (3), `orbits` (4), `tendrils` (5), `nebula` (6), `ascii` (7), `warp` (8). The HUD SHALL list each effect with its key, its name, and its technology label.

#### Scenario: HUD lists all effects
- **WHEN** the page has loaded
- **THEN** the HUD list shows eight entries in catalogue order, each with its key, name, and technology label

### Requirement: Default effect and deep link
The showcase SHALL start the effect whose id is in the URL hash. If the hash is empty or does not match an effect id, the showcase SHALL start `gravity-well`.

#### Scenario: No hash
- **WHEN** the visitor opens the page with no URL hash
- **THEN** the `gravity-well` effect starts

#### Scenario: Hash selects an effect
- **WHEN** the visitor opens the page with the hash `#fluid`
- **THEN** the `fluid` effect starts

#### Scenario: Unknown hash
- **WHEN** the visitor opens the page with the hash `#not-an-effect`
- **THEN** the `gravity-well` effect starts

#### Scenario: Hash changes while the page is open
- **WHEN** the URL hash changes to `#warp` while a different effect is active
- **THEN** the `warp` effect becomes the active effect

### Requirement: Keyboard selection
The showcase SHALL select an effect when the visitor presses its key (`1`–`8`). `Space` and `ArrowRight` SHALL select the subsequent effect. `ArrowLeft` SHALL select the previous effect. Selection SHALL wrap at the two ends of the catalogue. The showcase SHALL ignore a key press that has the Meta, Control, or Alt modifier. `Space` SHALL NOT scroll the page.

#### Scenario: Number key
- **WHEN** the visitor presses `3`
- **THEN** the `matrix` effect becomes the active effect

#### Scenario: Next wraps to the first effect
- **WHEN** `warp` is active and the visitor presses `Space`
- **THEN** `gravity-well` becomes the active effect

#### Scenario: Previous wraps to the last effect
- **WHEN** `gravity-well` is active and the visitor presses `ArrowLeft`
- **THEN** `warp` becomes the active effect

#### Scenario: Modifier key is ignored
- **WHEN** the visitor presses `Control` + `2`
- **THEN** the active effect does not change

### Requirement: HUD list selection
The showcase SHALL select an effect when the visitor clicks its entry in the HUD list.

#### Scenario: Click an entry
- **WHEN** the visitor clicks the `nebula` entry in the HUD list
- **THEN** `nebula` becomes the active effect

### Requirement: Active effect display
When an effect becomes active, the showcase SHALL set the hero title and description to those of the effect, set the HUD command line to `run <name>`, set the HUD technology value, mark only that entry as active in the HUD list, and set the URL hash to the effect id.

#### Scenario: Display follows selection
- **WHEN** `fluid` becomes the active effect
- **THEN** the hero title reads `NEON FLUID`, the HUD command line reads `run neon-fluid`, the HUD technology value reads `WebGL2 Navier–Stokes`, only the `fluid` entry is marked active, and the URL hash is `#fluid`

### Requirement: Live statistics
While an effect runs, the HUD SHALL show frames per second, the CPU time of the last effect update in milliseconds with one decimal, and the element count that the effect reports. The HUD SHALL refresh these values approximately two times per second. If the effect reports no count, the HUD SHALL show `--`.

#### Scenario: Statistics refresh
- **WHEN** an effect has run for one second
- **THEN** the HUD shows numeric values for fps and ms, and shows the count of the effect with locale digit grouping

### Requirement: UI hide toggle
The `h` key SHALL toggle the visibility of the HUD and of the site content together. The background effect SHALL continue to run while the UI is hidden.

#### Scenario: Hide and show
- **WHEN** the visitor presses `h` two times
- **THEN** the HUD and the site content are hidden after the first press and visible after the second press

### Requirement: Load error display
If an effect fails to load or to start, the showcase SHALL show `error: <message>` in the hero description and SHALL continue to accept selections.

#### Scenario: Effect fails to start
- **WHEN** the start of the selected effect throws an error with the message `WebGL2 not available`
- **THEN** the hero description reads `error: WebGL2 not available` and a subsequent key press can select a different effect

### Requirement: Debug API
The showcase SHALL expose `window.mousefx` with `select(id)`, `next(step)`, `registry`, `pointer`, `current`, and `def` while the page is mounted.

#### Scenario: Programmatic selection
- **WHEN** a script calls `window.mousefx.select('ascii')`
- **THEN** `ascii` becomes the active effect and `window.mousefx.def.id` is `ascii`
