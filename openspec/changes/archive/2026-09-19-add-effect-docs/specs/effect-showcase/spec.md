# Spec Delta

## ADDED Requirements

### Requirement: Links to the docs
The `docs` link in the showcase header SHALL open the docs index at `/docs`. The showcase hero SHALL show a "how it works" link that opens the docs page of the active effect at `/docs/<effect-id>`. The link target SHALL follow the active effect. The `h` key SHALL hide this link together with the other site content.

#### Scenario: Header link
- **WHEN** the visitor clicks `docs` in the showcase header
- **THEN** the docs index opens at `/docs`

#### Scenario: Link follows the active effect
- **WHEN** `nebula` becomes the active effect
- **THEN** the "how it works" link points to `/docs/nebula`

#### Scenario: Link is hidden with the UI
- **WHEN** the visitor presses `h`
- **THEN** the "how it works" link is hidden together with the hero text
