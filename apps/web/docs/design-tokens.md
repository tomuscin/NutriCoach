# Design Tokens

Leaxaro semantic color token reference. All tokens are HSL values in CSS variables.

---

## Light Mode (`:root`)

| Token | HSL | Usage |
|---|---|---|
| `--background` | `0 0% 98%` | Page background (#fafafa) |
| `--foreground` | `222 20% 10%` | Body text |
| `--card` | `0 0% 100%` | Card surfaces |
| `--card-foreground` | `222 20% 10%` | Text on cards |
| `--popover` | `0 0% 100%` | Floating panels |
| `--popover-foreground` | `222 20% 10%` | Text on popovers |
| `--primary` | `191 85% 33%` | Leaxaro teal |
| `--primary-foreground` | `0 0% 100%` | Text on primary |
| `--secondary` | `210 22% 94%` | Secondary surfaces |
| `--secondary-foreground` | `222 20% 25%` | Text on secondary |
| `--muted` | `210 18% 94%` | Muted backgrounds |
| `--muted-foreground` | `217 12% 50%` | Subdued text |
| `--accent` | `14 86% 56%` | Coral CTA / alerts |
| `--accent-foreground` | `0 0% 100%` | Text on accent |
| `--destructive` | `0 84% 57%` | Error / danger |
| `--destructive-foreground` | `0 0% 100%` | Text on destructive |
| `--success` | `160 65% 35%` | Success state |
| `--warning` | `38 90% 48%` | Warning state |
| `--border` | `214 20% 88%` | Borders |
| `--input` | `214 20% 88%` | Input backgrounds |
| `--ring` | `191 85% 33%` | Focus ring |

## Dark Mode (`.dark`)

> Premium SaaS aesthetic — blue-tinted surfaces, layered depth.  
> Inspired by: Linear, Raycast, Vercel dark, GitHub dark.

| Token | HSL | Hex approx | Usage |
|---|---|---|---|
| `--background` | `222 15% 7%` | `#0d1117` | Page background |
| `--foreground` | `213 22% 93%` | `#e8edf5` | Body text |
| `--card` | `222 15% 10%` | `#141921` | Elevated card surfaces |
| `--card-foreground` | `213 22% 93%` | — | Text on cards |
| `--popover` | `222 15% 12%` | `#181f28` | Floating modals, dropdowns |
| `--popover-foreground` | `213 22% 93%` | — | Text on popovers |
| `--primary` | `191 85% 52%` | `#0ed2f7` approx | Bright teal |
| `--primary-foreground` | `222 15% 7%` | `#0d1117` | Dark text on teal |
| `--secondary` | `222 14% 17%` | `#1e2737` | Elevated muted |
| `--secondary-foreground` | `213 22% 85%` | — | Text on secondary |
| `--muted` | `222 14% 14%` | `#191f2b` | Chip / tag backgrounds |
| `--muted-foreground` | `216 12% 58%` | `#848fa0` | Subdued text |
| `--accent` | `14 86% 60%` | `#f56a40` | Coral CTA |
| `--accent-foreground` | `0 0% 100%` | — | Text on accent |
| `--destructive` | `0 65% 45%` | — | Error state |
| `--destructive-foreground` | `0 0% 100%` | — | — |
| `--success` | `160 55% 42%` | — | Success |
| `--warning` | `38 85% 52%` | — | Warning |
| `--border` | `222 14% 18%` | `#1e2737` | Subtle blue-tinted border |
| `--input` | `222 14% 16%` | `#1a2130` | Input background |
| `--ring` | `191 85% 52%` | — | Focus ring |

## Tailwind Usage

```tsx
// Always use semantic tokens, never literal colors
<div className="bg-background text-foreground">
<div className="bg-card border-border">
<p className="text-muted-foreground">
<button className="bg-primary text-primary-foreground">
```

## Anti-patterns

```tsx
// ❌ NEVER use literal colors — breaks dark mode
<div className="bg-white text-black">
<div className="bg-gray-100 text-gray-900">

// ✅ ALWAYS use semantic tokens
<div className="bg-background text-foreground">
<div className="bg-muted text-muted-foreground">
```
