# effect-docs Specification

## Purpose

The effect docs explain how each background effect works: its physics or math model, its frame pipeline, its real code, and its tuned constants. They let a visitor read the explanation while the documented effect runs behind the page.

## Requirements

### Requirement: Docs index
The site SHALL serve a docs index at `/docs`. The index SHALL list the eight effects in catalogue order, each with its name, its technology label, a one-sentence summary, and a link to its docs page. The index SHALL also link to the architecture page.

#### Scenario: Index lists all effects
- **WHEN** the visitor opens `/docs`
- **THEN** the page shows eight effect entries in catalogue order, and each entry links to `/docs/<effect-id>`

#### Scenario: Index links to architecture
- **WHEN** the visitor opens `/docs`
- **THEN** the page shows a link to `/docs/architecture`

### Requirement: Effect docs pages
The site SHALL serve one docs page for each effect id at `/docs/<effect-id>`. A path with an unknown id SHALL give the not-found page.

#### Scenario: Known effect
- **WHEN** the visitor opens `/docs/fluid`
- **THEN** the page shows the docs for `NEON FLUID`

#### Scenario: Unknown effect
- **WHEN** the visitor opens `/docs/not-an-effect`
- **THEN** the response status is 404

### Requirement: Effect page structure
Each effect docs page SHALL have these sections in this order, each with a heading that has an anchor id: Overview (`overview`), Interaction (`interaction`), Model (`model`), Frame pipeline (`pipeline`), Code (`code`), Tuned constants (`constants`), Performance (`performance`), References (`references`). The page SHALL show a table of contents that links to these anchors.

- Overview SHALL state what the visitor sees, the technology, and the element count.
- Interaction SHALL state the result of pointer movement, of a held button, and of the idle autopilot, and any other input that the effect reads.
- Model SHALL state the physics or math model with its formulas.
- Frame pipeline SHALL list the steps of one frame in order, with the buffers or data structures that each step reads and writes.
- Code SHALL show one or more excerpts from the effect source, each with an explanation.
- Tuned constants SHALL list each tuned value with its name, its value, what it controls, and the reason for the value.
- Performance SHALL state the cost drivers, the limits that the effect applies (for example the device pixel ratio limit), and the measured values with their measurement conditions.
- References SHALL link to the external sources that the effect is based on.

#### Scenario: All sections are present
- **WHEN** the visitor opens any of the eight effect docs pages
- **THEN** the page has the eight sections in the specified order, and each entry in the table of contents moves the view to its section

#### Scenario: Formulas are readable without a script
- **WHEN** a client requests an effect docs page with JavaScript disabled
- **THEN** the formulas in the Model section are readable as text

### Requirement: Code excerpts from the real source
Each code excerpt SHALL be taken from the current effect source file during the build, and SHALL show the path of its source file. The build SHALL fail with a message that names the page and the excerpt if an excerpt cannot be found in the source. Excerpts SHALL have syntax highlight that works with JavaScript disabled.

#### Scenario: Excerpt matches the source
- **WHEN** a line inside a documented region of an effect module changes and the site is built again
- **THEN** the excerpt on the docs page shows the changed line

#### Scenario: Missing excerpt fails the build
- **WHEN** a docs page names an excerpt that does not exist in the effect source
- **THEN** the production build has a non-zero exit code and the error names the page and the excerpt

### Requirement: Architecture page
The site SHALL serve a page at `/docs/architecture` that explains the shared runtime: the effect contract, the shared pointer (smoothing, velocity limit, autopilot), the frame loop (time step limit, pause while hidden), resize and device pixel ratio limits, reduced motion, on-demand loading, teardown, and how to embed one effect in a different site.

#### Scenario: Architecture page content
- **WHEN** the visitor opens `/docs/architecture`
- **THEN** the page explains each of the listed topics and shows a code excerpt of the effect contract from the real source

### Requirement: Live background
Each effect docs page SHALL run its effect as a live background behind the content, in the fixed-effect mode of the runtime. The content SHALL stay readable above the background: the text contrast against its backdrop SHALL be 4.5:1 or more at all times. The index page and the architecture page SHALL NOT run a background effect.

#### Scenario: The documented effect runs
- **WHEN** the visitor opens `/docs/tendrils`
- **THEN** the `tendrils` effect runs behind the content and follows the pointer

#### Scenario: Live statistics
- **WHEN** the background runs on an effect docs page
- **THEN** the page shows the live fps, update time, and element count of the effect

### Requirement: Background control
Each effect docs page SHALL have a control that stops and starts the background. A stopped background SHALL release its graphics resources and SHALL NOT run a frame loop. When the visitor has set `prefers-reduced-motion: reduce`, the background SHALL start in the stopped state. The control SHALL be operable with the keyboard and SHALL expose its state to assistive technology.

#### Scenario: Stop the background
- **WHEN** the visitor activates the background control while the effect runs
- **THEN** the effect canvas is removed and no effect update runs

#### Scenario: Start the background again
- **WHEN** the visitor activates the control while the background is stopped
- **THEN** the effect runs again

#### Scenario: Reduced motion
- **WHEN** the operating system requests reduced motion and the visitor opens an effect docs page
- **THEN** the background is stopped until the visitor starts it

### Requirement: Document behaviour
Docs pages SHALL behave as normal documents. The page SHALL scroll. The visitor SHALL be able to select and copy text and code. `Space` SHALL scroll the page. Number keys and arrow keys SHALL NOT change the effect. A heading anchor in the URL hash SHALL move the view to that heading and SHALL NOT change the effect.

#### Scenario: Scroll with Space
- **WHEN** the visitor presses `Space` on an effect docs page that is longer than the viewport
- **THEN** the page scrolls down and the background effect does not change

#### Scenario: Heading anchor
- **WHEN** the visitor opens `/docs/fluid#pipeline`
- **THEN** the view is at the Frame pipeline section and the background effect is `fluid`

#### Scenario: Copy code
- **WHEN** the visitor selects a code excerpt and copies it
- **THEN** the clipboard holds the text of the excerpt

### Requirement: Docs navigation
Each effect docs page SHALL link to the docs index, to the previous and the next effect page in catalogue order (with wrap at the two ends), and to the showcase with that effect selected (`/#<effect-id>`). The index and the architecture page SHALL link to the showcase.

#### Scenario: Open the effect in the showcase
- **WHEN** the visitor follows the showcase link on `/docs/orbits`
- **THEN** the showcase opens with `orbits` as the active effect

#### Scenario: Next wraps
- **WHEN** the visitor follows the next link on `/docs/warp`
- **THEN** `/docs/gravity-well` opens

### Requirement: Static delivery
Docs pages SHALL deliver their full text, formulas, tables, and highlighted code in the initial HTML response. Each docs page SHALL have a document title that names the effect or the page.

#### Scenario: Text without JavaScript
- **WHEN** a client requests `/docs/nebula` with JavaScript disabled
- **THEN** the response contains all eight section headings and the text of the code excerpts

#### Scenario: Page title
- **WHEN** the visitor opens `/docs/nebula`
- **THEN** the document title contains `NEBULA`
