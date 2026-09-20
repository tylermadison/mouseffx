# Spec Delta

## ADDED Requirements

### Requirement: Fixed-effect mode
The runtime SHALL be able to host one given effect in a fixed-effect mode. In this mode the runtime SHALL NOT change the effect because of key presses or URL hash changes, SHALL NOT write the URL hash, SHALL NOT prevent the default action of any key, and SHALL NOT expose `window.mousefx`. All other runtime requirements (shared pointer, frame loop stability, resize, reduced motion, on-demand loading, full teardown) SHALL apply in this mode. The runtime SHALL report live statistics in this mode.

#### Scenario: Keys do not change a fixed effect
- **WHEN** the runtime hosts `fluid` in fixed-effect mode and the visitor presses `3`, `Space`, and `ArrowRight`
- **THEN** `fluid` stays the active effect and `Space` scrolls the page

#### Scenario: Hash does not change a fixed effect
- **WHEN** the runtime hosts `fluid` in fixed-effect mode and the URL hash changes to `#warp`
- **THEN** `fluid` stays the active effect and the runtime does not change the URL hash

#### Scenario: No debug API in fixed-effect mode
- **WHEN** the runtime hosts an effect in fixed-effect mode
- **THEN** `window.mousefx` is undefined

#### Scenario: Move between showcase and fixed-effect page
- **WHEN** the visitor goes from the showcase to a page with a fixed effect and back, three times, with no full page load
- **THEN** one effect runs at each step, and the browser reports no "too many active WebGL contexts" warning
