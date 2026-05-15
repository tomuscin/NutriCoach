# Dark Depth System — Leaxaro

## Problem

Dark mode without depth hierarchy collapses all surfaces into "flat mud" — cards look the same as the background, nothing has weight or focus.

## Solution: 5-Level Elevation System

Each level is a progressively lighter blue-tinted surface. Conceptually mimics ambient light scattering at different heights.

### CSS Variables (dark mode)

```css
.dark {
  /* Base (background) */
  --background: 222 15% 7%;        /* #0d1117 */

  /* Elevation surfaces */
  --surface-0: 222 15% 7%;         /* = background */
  --surface-1: 222 14% 10%;        /* +3% lightness — sidebar, cards */
  --surface-2: 222 13% 13%;        /* +6% — elevated cards */
  --surface-3: 222 13% 16%;        /* +9% — modals, popovers */
  --surface-4: 222 12% 19%;        /* +12% — tooltips, dropdowns */
}
```

### Usage Ladder

| Component | Surface Level | Notes |
|---|---|---|
| Page background | `--surface-0` | `bg-background` |
| Sidebar | `--surface-1` | Slightly elevated from page |
| Cards | `bg-card` (= surface-1) | Default card bg |
| Elevated cards | `--surface-2` | E.g. featured stat |
| Modals / sheets | `--surface-3` | Float above content |
| Tooltip / dropdown | `--surface-4` | Highest z-index surfaces |

## Inset Highlight

Adds "light from above" depth illusion — a subtle top-edge glow that makes surfaces feel three-dimensional.

```css
.dark {
  --inset-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
/* Light mode: */
:root {
  --inset-highlight: none;
}
```

Applied on interactive surfaces:
```tsx
style={{ boxShadow: 'var(--shadow-lg), var(--inset-highlight)' }}
```

## Shadow System (5 levels)

Dark mode: `rgba(0,0,0,x)` opacity-based shadows (NOT white-based, NOT `hsl(var(--shadow))`)
Light mode: subtle `rgba(0,0,0,0.05-0.12)` shadows

```css
.dark {
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.32);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.36);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.48);
}
```

Tailwind tokens:
```
shadow-elevation-1 → var(--shadow-xs)
shadow-elevation-2 → var(--shadow-sm)
shadow-elevation-3 → var(--shadow-md)
shadow-elevation-4 → var(--shadow-lg)
shadow-elevation-5 → var(--shadow-xl)
```

## Border System (3 tiers)

```css
--border:        hsl(220 12% 18%)   /* default card/input borders */
--border-subtle: hsl(220 12% 14%)   /* dividers, very subtle separation */
--border-strong: hsl(220 12% 26%)   /* emphasized borders, focus */
```
