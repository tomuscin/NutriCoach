# Mobile UX Principles — NutriCoach ETAP 7

## Core Patterns

### Safe Area Padding
All mobile screens must account for the bottom navigation bar (88px) and device safe areas.

```tsx
// Main content area in (app)/layout.tsx
<main className="pb-24 md:pb-6 max-w-7xl ...">
```

`pb-24` (96px) = 88px bottom nav + 8px buffer. This ensures content is never hidden behind the nav on mobile.

For screens with fixed bottom actions (forms, CTAs):
```tsx
<div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
  <button ...>Save</button>
</div>
// + add extra pb-24 to the scrollable content
```

### Bottom Navigation Bar
5 items max. Current items:
| Icon | Label | Route |
|------|-------|-------|
| Home | Start | /dashboard |
| Salad | Żywienie | /nutrition |
| Activity | Aktywność | /workouts |
| BrainCircuit | AI Coach | /ai-coach |
| Settings | Ustawienia | /settings |

Implementation: `(app)/layout.tsx` — fixed bar at bottom with `safe-area-inset-bottom` class.

### Touch Targets
All interactive elements must meet minimum 44×44px touch target:
```tsx
// Minimum button size
className="min-h-[44px] min-w-[44px] flex items-center justify-center"

// Icon buttons in header
className="h-10 w-10 flex items-center justify-center rounded-xl"
```

### Mobile Header
- Left: logo/app name
- Right: Bell (notifications) + Settings icon buttons
- Height: 56px
- Hidden on desktop (sidebar handles navigation)

## Responsive Layout Strategy

### Sidebar (desktop md+)
- Fixed left sidebar, 240px wide
- Logo + main nav items + settings/notifications + user info + logout
- Hidden on mobile (`hidden md:flex`)

### Mobile Bottom Nav
- Fixed bottom bar
- 5 items with icon + label
- Active item: primary color text + bg tint
- Visible only on mobile (`flex md:hidden`)

## Card Design System

### Standard card
```tsx
className="rounded-2xl border border-border bg-card p-4 md:p-6"
```

### Interactive card (hover state)
```tsx
className="rounded-2xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer"
```

### Status-colored card
```tsx
// Error state
className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4"
// Warning state
className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
// Success state
className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4"
```

## Typography Scale

| Use | Class |
|-----|-------|
| Page title | `text-2xl font-bold tracking-tight` |
| Section heading | `text-lg font-semibold` |
| Card title | `text-sm font-semibold` |
| Body | `text-sm text-foreground` |
| Caption / metadata | `text-xs text-muted-foreground` |

## Empty States

Use `EmptyState` component from `@/components/ui/EmptyState`:
```tsx
import { NoTPConnectionEmpty } from '@/components/ui/EmptyState'
// ... or use EmptyState directly with custom icon, title, description, action
```

Always center vertically in the content area with `py-12`.

## Loading States

Use skeleton loaders (Tailwind `animate-pulse`) over spinners for content areas:
```tsx
<div className="rounded-xl bg-muted animate-pulse h-24" />
```

Use `Loader2` spinning icon for button loading states:
```tsx
{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
```

## PWA Considerations

- `manifest.json`: icons at 192×192 and 512×512, `display: standalone`, `theme_color`
- Service worker: `public/sw.js` — push events + offline caching
- Offline page: `/offline` route
- All pages should work without JS for auth routes (server components)
