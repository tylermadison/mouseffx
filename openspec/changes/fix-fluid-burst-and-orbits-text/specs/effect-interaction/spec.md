# Spec Delta

## Purpose

Effect interaction specifies what a visitor sees when the mouse button is pressed or held in an effect, for the effects where this behaviour needs a contract. It also keeps the visitor-facing text about an interaction in agreement with the behaviour.

## ADDED Requirements

### Requirement: Fluid press burst
On the frame where the button goes down, `fluid` SHALL add one burst at the pointer position. The burst SHALL add dye and a velocity field that points away from the pointer position in all directions, so that the dye of the burst moves outward. The burst SHALL occur one time for each press. A held button SHALL NOT add more bursts.

#### Scenario: Burst dye moves outward
- **WHEN** the fluid is at rest with no dye, and the visitor presses the button with the pointer at the centre of the viewport and does not move the pointer
- **THEN** after 0.5 s the mean distance of the dye from the press position, weighted by dye brightness, is larger than its value on the press frame by 0.08 of the viewport height or more

#### Scenario: One burst for each press
- **WHEN** the visitor holds the button for 2 s and does not move the pointer
- **THEN** the effect adds dye on the press frame only

#### Scenario: Second press
- **WHEN** the visitor releases the button and presses it again
- **THEN** the effect adds a second burst at the current pointer position

### Requirement: Orbits press and hold
On the frame where the button goes down, `orbits` SHALL start a nova shockwave: for less than 1 s, all bodies get a strong acceleration away from the star, the star glow is larger, and a white ring expands from the star. While the button stays down, the star SHALL repel the bodies. When the visitor releases the button, the star SHALL attract the bodies again. A held button SHALL NOT start a second shockwave.

#### Scenario: Press starts the shockwave
- **WHEN** the visitor presses the button
- **THEN** a white ring expands from the star and the bodies move away from the star, and the ring is gone in less than 1 s

#### Scenario: Hold repels
- **WHEN** the visitor holds the button for 3 s
- **THEN** one shockwave occurs at the start, and for the full 3 s the bodies accelerate away from the star and the core of the star glow is amber

#### Scenario: Release attracts
- **WHEN** the visitor releases the button
- **THEN** the core of the star glow is cyan and the bodies accelerate to the star again

### Requirement: Descriptions agree with the interaction
The visitor-facing text about an effect (the catalogue description in the showcase, the effect docs page, and the README effect table) SHALL NOT name an input for a result that a different input causes. For `orbits`, the catalogue description SHALL state that a press causes the nova and that a hold repels. For `fluid`, the docs page and the README SHALL state that the press causes the burst.

#### Scenario: Orbits description in the showcase
- **WHEN** `orbits` is the active effect in the showcase
- **THEN** the hero description states that a press causes the nova and that a hold repels, and it does not state that a hold causes the nova

#### Scenario: Fluid docs describe the burst
- **WHEN** the visitor reads the Interaction section of the `fluid` docs page
- **THEN** the section states that a press adds a ring of splats that moves the dye outward, and it does not state that the burst velocities cancel

#### Scenario: README effect table
- **WHEN** a reader reads the `fluid` and `orbits` rows of the README effect table
- **THEN** the `fluid` row gives the press as the cause of the burst ring, and the `orbits` row gives the press as the cause of the nova and the hold as the cause of the repulsor
