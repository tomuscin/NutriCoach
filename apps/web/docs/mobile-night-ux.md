# Mobile Night UX — Leaxaro

## Design Philosophy

On mobile at night, users view the app in low-ambient-light environments. Priorities:
1. **No harsh bright elements** — nothing should blast white in a dark room
2. **Glass surfaces** — translucency keeps context without opaque blocking
3. **Thumb-zone ergonomics** — navigation in bottom bar, content above
4. **Safe area insets** — respect iOS home indicator area

## Mobile Navigation Architecture

### Mobile Header (top)

```tsx
// (app)/layout.tsx — mobile header
<header className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 glass md:hidden border-b border-border/40">
  {/* Logo + page title */}
</header>
```

- `glass` class: `backdrop-blur(8px)` + `bg-background/88`
- `border-border/40` — subtle separator that doesn't distract
- `sticky top-0 z-40` — stays above content scroll

### Mobile Bottom Navigation

```tsx
// Fixed bottom bar
<nav className="fixed inset-x-0 bottom-0 z-40 glass-strong safe-area-inset-bottom md:hidden border-t border-border/50">
  <div className="flex items-center justify-around h-16 px-2">
    {navItems.map(item => <NavLink key={item.href} {...item} vertical />)}
  </div>
</nav>
```

- `glass-strong`: stronger blur for nav prominence
- `safe-area-inset-bottom`: padding for iOS home indicator
- `NavLink vertical`: column layout (icon + label), active = `text-primary`

### Content Padding

```tsx
<main className="... pb-20 md:pb-0">
  {/* pb-20 = bottom nav clearance on mobile */}
</main>
```

## `safe-area-inset-bottom` Utility

```css
.safe-area-inset-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), 0.5rem);
}
```

Uses `env(safe-area-inset-bottom)` for iOS notch/home-indicator-safe rendering. Falls back to 0.5rem on non-notch devices.

## Glass Surface Implementation

```css
.glass {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background-color: hsl(var(--background) / 0.88);
}

.glass-strong {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background-color: hsl(var(--background) / 0.94);
  border-top: 1px solid hsl(var(--border) / 0.5);
}
```

Works because `--background` is defined as HSL components (e.g. `222 15% 7%`), enabling `hsl(var(--background) / alpha)` syntax for alpha blending.

## Touch Target Sizing

All interactive nav elements use `min-w-[3.5rem]` (56px) to meet WCAG 2.5.5 target size guidelines.

## Active State on Mobile

`NavLink` with `vertical={true}` uses `text-primary` for active state (no background highlight — keeps the nav clean and uncluttered at night).

## Dark Mode Surface on Mobile

The bottom nav (`glass-strong`) blends with the dark background at ~94% opacity, so scrolled content shows faintly through — creating depth without fully hiding context.
