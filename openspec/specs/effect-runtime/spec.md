# effect-runtime Specification

## Purpose

The effect runtime hosts one background effect at a time behind the page content. It gives each effect a shared pointer, a stable frame loop, and resize data, and it releases all resources when an effect or the page goes away.

## Requirements

### Requirement: Effect contract
Each effect SHALL implement `init({ container, pointer, width, height, dpr, reduced })`, `update(dt, t)`, `resize(width, height, dpr)`, and `dispose()`, and SHALL expose `count`. An effect SHALL draw only into canvases that it adds to the given container.

#### Scenario: Embedding one effect
- **WHEN** a host page imports one effect module, calls `init` with a container and a pointer, and calls `update` each frame
- **THEN** the effect renders into the container with no dependency on the showcase UI

### Requirement: Single active effect
The runtime SHALL run one effect at a time. Before a new effect starts, the runtime SHALL dispose the previous effect and empty the container. The runtime SHALL ignore a selection request for the effect that is already active.

#### Scenario: Switch effects
- **WHEN** `fluid` is active and `orbits` is selected
- **THEN** the container holds only the canvases of `orbits`, and the graphics context of `fluid` is released

#### Scenario: Many switches
- **WHEN** the visitor cycles through all eight effects three times
- **THEN** the browser reports no "too many active WebGL contexts" warning

### Requirement: On-demand effect loading
The runtime SHALL load the code of an effect only when that effect is first selected.

#### Scenario: Canvas-only session
- **WHEN** the visitor opens `#matrix` and selects no other effect
- **THEN** the browser does not download the code of the other seven effects or the 3D library

### Requirement: Background layer
The effect container SHALL fill the viewport behind the page content and SHALL NOT receive pointer events. Links in the page content SHALL stay usable.

#### Scenario: Link above the effect
- **WHEN** an effect runs and the visitor clicks a navigation link
- **THEN** the link receives the click

### Requirement: Shared pointer
The runtime SHALL give effects one pointer object with position, smoothed position, smoothed velocity, speed, button state, and idle state. The runtime SHALL limit the raw velocity to 5000 px/s. After 2.5 s with no pointer movement, the pointer SHALL go into autopilot and move on a slow path near the viewport centre. The pointer SHALL go back to the real position when the visitor moves the mouse.

#### Scenario: Autopilot starts
- **WHEN** the visitor does not move the pointer for 3 s
- **THEN** the pointer reports `idle` as true and its position continues to change

#### Scenario: Autopilot stops
- **WHEN** the pointer is in autopilot and the visitor moves the mouse
- **THEN** the pointer reports `idle` as false and its position is the real mouse position

#### Scenario: Button release outside the window
- **WHEN** the visitor holds the mouse button and the window loses focus
- **THEN** the pointer reports `down` as false

### Requirement: Frame loop stability
The runtime SHALL limit the time step given to an effect to 0.05 s. The runtime SHALL stop the frame loop while the document is hidden and SHALL start it again, with no time jump, when the document becomes visible.

#### Scenario: Tab hidden and shown
- **WHEN** the tab is hidden for 60 s and then shown
- **THEN** no update runs while the tab is hidden, and the first update after the tab is shown receives a time step of 0.05 s or less

### Requirement: Resize
When the viewport size changes, the runtime SHALL call `resize` on the active effect with the new width, height, and device pixel ratio. The runtime SHALL debounce resize events by approximately 60 ms and SHALL limit the device pixel ratio to 2.

#### Scenario: Window resize
- **WHEN** the visitor changes the window size
- **THEN** the effect canvas fills the new viewport in 200 ms or less

### Requirement: Reduced motion
When the visitor has set `prefers-reduced-motion: reduce`, the runtime SHALL pass `reduced: true` to the effect and the cursor blink animation SHALL stop.

#### Scenario: Reduced motion preference
- **WHEN** the operating system requests reduced motion and the page loads
- **THEN** the active effect receives `reduced: true`

### Requirement: Particle quality parameter
The `gravity-well` effect SHALL read the `q` query parameter as the side length of its particle grid. Without the parameter, the side length SHALL be 512 on desktop and 256 on mobile.

#### Scenario: High quality
- **WHEN** the visitor opens the page with `?q=1024`
- **THEN** the HUD count for `gravity-well` reads 1,048,576

### Requirement: Server render safety
The page SHALL deliver its static content (brand, navigation, hero text for the default effect, HUD frame) in the initial HTML response. The production build and the server render SHALL complete with no error caused by browser-only APIs.

#### Scenario: Initial HTML
- **WHEN** a client requests `/` with JavaScript disabled
- **THEN** the response contains the brand text, the hero title `GRAVITY WELL`, and the HUD frame

#### Scenario: Production build
- **WHEN** the production build runs
- **THEN** it completes with exit code 0 and reports no `window is not defined` or `document is not defined` error

### Requirement: Full teardown
When the runtime unmounts, it SHALL dispose the active effect, stop the frame loop, remove all window and document listeners that it added (runtime and pointer), and remove `window.mousefx`. If an effect load completes after the unmount, the runtime SHALL NOT start that effect.

#### Scenario: Mount, unmount, mount
- **WHEN** the runtime mounts, unmounts immediately, and mounts again
- **THEN** the container holds the canvases of one effect only, one frame loop runs, and one key press changes the effect one time

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
