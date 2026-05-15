# Visual Polish Pass — Leaxaro

Premium visual systems refinement pass targeting App Store / Linear / Vercel quality dark UX.

## Scope

| Area | Status | Details |
|---|---|---|
| globals.css rebuild | ✅ | Elevation, shadows, component layer, glass, badges, skeleton, keyframes |
| tailwind.config.ts | ✅ | boxShadow tokens (elevation-1…5), animations |
| App layout | ✅ | Sidebar depth, glass header/nav, logo pill, NavLink active state |
| Charts | ✅ | useChartColors hook, Bloomberg aesthetic, glass tooltip |
| EmptyState | ✅ | Gradient icon focal point, fade-in, premium button |
| StatCard | ✅ | Hover lift, shadow |
| IntegrationCard | ✅ | Hover lift, shadow |
| Skeletons | ✅ | `.skeleton` class with directional shimmer |
| Auth pages | ✅ | Card depth, logo pill, animate-fade-in |
| Auth form inputs | ✅ | `.form-input` class with dark mode focus ring |
| not-found page | ✅ | Semantic token (`bg-primary`, `shadow-elevation-2`) |

## Inspirations

Linear, Raycast, Vercel, Notion, Arc Browser, iOS Settings dark, ChatGPT dark UI.

## Key Design Decisions

- **Elevation system**: 5 levels of incrementally lighter blue-tinted surfaces in dark mode
- **No flat-mud effect**: Each elevation level is distinct (+3% lightness per step)
- **Inset highlight**: `inset 0 1px 0 rgba(255,255,255,0.05)` — "light from above" depth illusion
- **Shadow system**: Dark mode uses `rgba(0,0,0,x)` opacity-based shadows (not white-based)
- **Glass surfaces**: `backdrop-filter: blur(8px)` + `hsl(var(--background) / 0.88)` — works because HSL components are separated
- **Charts**: SVG presentation attributes cannot evaluate CSS variables — `useChartColors()` hook returns hardcoded resolved strings per theme
- **NavLink**: `usePathname()` requires a client component — `NavLink.tsx` is `'use client'` and supports exact/prefix matching
