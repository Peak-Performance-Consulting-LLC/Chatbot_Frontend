# AeroConcierge Homepage Figma Handoff

This is the design blueprint for the platform landing page implemented in `frontend/src/platform/pages/LandingPage.tsx`.

## Palette

- `Deep Teal`: `#006D77`
- `Mint`: `#83C5BE`
- `Mist`: `#EDF6F9`
- `Blush`: `#FFDDD2`
- `Coral`: `#E29578`

## Typography

- `Display`: Fraunces
- `UI / Body`: Manrope

## Frames

### Desktop

- Frame: `1440 x 2600`
- Outer page padding: `24`
- Content width: `1280`

### Tablet

- Frame: `1024 x auto`
- Outer page padding: `20`
- Content width: `100%`

### Mobile

- Frame: `390 x auto`
- Outer page padding: `14`
- Buttons stack full-width

## Section Order

1. Topbar
2. Hero
3. Proof strip
4. Four-step onboarding grid
5. Service band
6. Bottom CTA

## Components

### Topbar

- Left: brand mark + product name
- Right: `Login` and `Create Workspace`
- Background: glassmorphism white with teal border
- Radius: `22`

### Hero Left

- Eyebrow
- Large editorial headline
- Supporting paragraph
- Primary CTA row
- Service chips row
- Three metric cards

### Hero Right

- Dark teal showcase surface
- Inner console card
- Status pill
- Two stacked panels:
  - onboarding panel
  - widget preview panel

### Proof Strip

- 3 equal cards
- Each card:
  - small uppercase label
  - one strong statement

### Onboarding Grid

- 4 equal cards on desktop
- 2 columns on tablet
- 1 column on mobile
- Each card contains:
  - step index badge
  - step title
  - short explanation

### Service Band

- Left: section heading
- Right: 3 service cards
  - flights
  - hotels/cars/cruises
  - tenant-specific knowledge

### Bottom CTA

- Left: closing message
- Right: CTA buttons

## Radius System

- Primary shells: `32-34`
- Cards: `20-24`
- Pills / buttons: `999`

## Shadow System

- Main shell shadow: `0 22px 48px rgba(0, 72, 78, 0.08)`
- CTA shadow: `0 16px 28px rgba(0, 109, 119, 0.24)`

## Responsive Rules

- Hero stacks at `1160px`
- Proof strip stacks to one column at `1160px`
- Service band stacks at `1160px`
- Buttons become full-width at `640px`
- Bottom CTA becomes vertical on smaller screens

## Notes

- The page should feel premium and warm, not cold SaaS blue.
- Use teal as the anchor color.
- Use blush/coral only as accent surfaces, not for body text.
- Preserve strong contrast for buttons and headings.
