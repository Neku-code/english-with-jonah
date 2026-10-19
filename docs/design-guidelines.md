# Design guidelines

## Design direction

Use **Clay & Sage**: a calm, grounded palette with a friendly-teacher tone.

The audience is university freshmen learning English from zero. Present content clearly, keep instructions approachable, and make it easy to identify the next action.

## Confirmed palette

| Role | Color | Description and intended use |
| --- | --- | --- |
| Background | `#F6F0E6` | Warm paper; main application background |
| Primary | `#B9603C` | Terracotta, like sun-baked adobe; primary brand color |
| Secondary | `#8BA383` | Sage; secondary supporting color |
| Accent | `#E2A845` | Honey mustard; progress and highlights |
| Text | `#2F2A25` | Warm charcoal, rather than pure black |

Use these colors consistently across student and teacher screens. Box 1's supporting colors, typography, spacing, and component details are documented below as implementation choices.

## Box 1 implementation choices

Box 1 includes plain verification specimens at `/foundation`. The Boxes 2–3 brief now authorizes student entry and home design: restrained neutral surfaces, readable spacing, subtle borders, coordinated rounded corners and no childish illustrations or decorative statistics. Reference images establish colours only. **DM Sans** remains the self-hosted reading font. Reusable CSS tokens and Svelte components live in `src/app.css` and `src/lib/components/`. Supporting clay `#AE5634` gives white button text 5.02:1 contrast while the primary brand token remains `#B9603C`. Supporting muted text `#70665B` on paper gives 4.95:1 contrast. Student UI uses natural Uzbek Latin script.

## Responsive requirements

The Unit 1 player uses a 1360px workspace and 220px lesson sidebar at >=1100px.
Tablet navigation uses a lesson dialog; phones below 768px use one column with
18px side padding, 17px writing controls, safe-area bottom navigation and
independent panel controls. Reading surfaces use `#FFFDF8`; diagrams retain the
supplied artwork. See Unit 1 screenshots and validation for observed breakpoints.

Phone and laptop support is a core requirement, not a later enhancement.

- Keep lessons, account entry, exercises, and progress views usable on narrow phone screens and wider laptop screens.
- Make teacher administration usable on both device types.
- Let content reflow without clipping or requiring horizontal scrolling for ordinary tasks.
- Use readable text, comfortable spacing, and controls that work with touch, mouse, and keyboard.
- Adapt navigation and dashboard layouts to the available width.
- Check core flows at phone and laptop sizes during implementation.

## Implementation guidance

- Define the confirmed palette as reusable CSS custom properties.
- Verify text and control contrast for each actual foreground/background pairing; palette membership alone does not guarantee readable contrast.
- Use labels or symbols alongside color for progress, correctness, and status.
- Keep forms and exercise instructions clear for complete beginners.
- Avoid assuming that all students have a large screen or use a mouse.

## Second-check lesson structure

Current lessons use one short explanation/example or one practice per window.
Use Next/Previous controls and a position indicator, with no sublesson tabs.
Allow natural reflow for small phones/keyboard use; do not replace the lesson
with one long page. The selected visual redesign is reserved for check 3.
