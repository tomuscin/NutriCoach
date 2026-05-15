# Theme System

Leaxaro uses a production-grade dark mode system based on `next-themes` + Tailwind CSS variables.

---

## Architecture

```
next-themes (ThemeProvider)
  └── attribute="class"       → adds/removes .dark on <html>
  └── storageKey="leaxaro-theme"
  └── defaultTheme="system"
  └── enableSystem             → follows OS preference

CSS Variables (:root / .dark)
  └── --background, --foreground, --card, ...
  └── mapped in tailwind.config.ts to Tailwind tokens

No-flash script (inline in <head>)
  └── reads localStorage before React hydrates
  └── applies dark class immediately → zero FOUC
```

## Modes

| Mode | Behaviour |
|---|---|
| `system` | Follows `prefers-color-scheme` OS setting |
| `light` | Always light |
| `dark` | Always dark |

## Persistence

- `localStorage` key: `leaxaro-theme`
- DB field: `UserPreferences.darkMode` (system | light | dark)
- Server reads DB → passes `defaultTheme` to `ThemeProvider`

## Files

| File | Purpose |
|---|---|
| `src/components/providers/ThemeProvider.tsx` | next-themes wrapper |
| `src/components/providers/ThemeColorSync.tsx` | Updates `<meta name="theme-color">` |
| `src/components/ui/ThemeToggle.tsx` | Segmented control component |
| `src/hooks/useThemeColor.ts` | Hook that syncs browser chrome color |
| `src/app/globals.css` | CSS variable definitions |
| `tailwind.config.ts` | Token → Tailwind class mapping |

## Design Tokens

See [design-tokens.md](./design-tokens.md) for full token reference.

## Settings Integration

Settings → Wygląd → segmented control (System / Jasny / Ciemny)  
Theme change is applied instantly via `next-themes`.  
On save, `darkMode` is persisted to DB via `PATCH /api/settings/preferences`.
