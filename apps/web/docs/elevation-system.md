# Elevation System — Leaxaro Component Reference

## Component Classes (globals.css @layer components)

### Cards

| Class | Use case |
|---|---|
| `.card-base` | Standard card — `bg-card border border-border rounded-xl shadow-xs` |
| `.card-interactive` | Hover lift card — adds hover shadow + translate-y |
| `.card-elevated` | One step above page — `bg-[hsl(var(--surface-2))]` |
| `.card-floating` | Modal / sheet content — `bg-[hsl(var(--surface-3))]` + shadow-lg + inset-highlight |
| `.card-muted` | De-emphasized card — `bg-muted/40` |
| `.card-inset` | Inset content area — `bg-[hsl(var(--surface-0))] border-border/50` |

### Buttons

| Class | Variant |
|---|---|
| `.btn` | Base — sizing, transition, focus ring |
| `.btn-primary` | Brand teal fill |
| `.btn-secondary` | Muted surface |
| `.btn-ghost` | Transparent + hover bg |
| `.btn-outline` | Border + hover fill |
| `.btn-destructive` | Red destructive action |

### Form Inputs

`.form-input` — Full-width input with:
- Dark mode: `bg-[hsl(var(--surface-1))]` surface
- `border-border` default, `:focus` ring: `0 0 0 3px hsl(var(--ring) / 0.18)` + inset-highlight
- Placeholder muted, disabled opacity

### Badges

| Class | Color |
|---|---|
| `.badge` | Base |
| `.badge-primary` | Brand teal |
| `.badge-success` | Green |
| `.badge-warning` | Amber |
| `.badge-destructive` | Red |
| `.badge-muted` | Gray |

### Skeleton

`.skeleton` — Loading state with directional shimmer via `::after` pseudo-element. Theme-aware (bg-muted base, lighter shimmer).

### Glass Surfaces

| Class | Use case |
|---|---|
| `.glass` | Mobile header backdrop — `backdrop-blur(8px)` + `bg-background/88` |
| `.glass-strong` | Mobile bottom nav — stronger blur + border |

### Surface Utilities

`.surface-0` through `.surface-3` — set background to the corresponding elevation variable.

### Animations

| Class | Description |
|---|---|
| `.animate-fade-in` | Opacity 0→1, 0.2s |
| `.animate-slide-up` | Translate + fade, 0.3s |
| `.animate-scale-in` | Scale 0.95→1 + fade, 0.2s |
| `.animate-pulse-glow` | Subtle glow pulse |
| `.hover-lift` | Hover: -translate-y-1 + shadow-md |
| `.hover-lift-sm` | Hover: -translate-y-0.5 + shadow-sm |

## Chart Colors

Charts (Recharts) cannot use CSS variables in SVG presentation attributes.
Use `useChartColors()` hook from `@/hooks/useChartColors`.

```tsx
const c = useChartColors()
// c.primary, c.grid, c.axis, c.tooltip.{background, border, text}
// c.reference, c.success, c.warning, c.destructive, c.blue
```

Returns hardcoded HSL strings based on resolved theme. SSR-safe (returns LIGHT before hydration).
