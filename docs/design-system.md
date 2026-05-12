# NutriCoach — Design System

## Design Philosophy

**Premium. Athletic. Clean.**
Inspired by TrainingPeaks, WHOOP, Oura, Strava.

Core principles:
- Data is the hero — numbers and charts are primary
- Mobile-first — 80%+ users will use on phone
- Dark mode is default for sports/health apps (reduces eye strain)
- Minimalism — no clutter, generous whitespace
- Performance feedback — every interaction has a clear visual response

---

## Color System

### Brand (Teal/Blue — primary interactions)
```
brand-50: #edfafa    — very light tint, backgrounds
brand-400: #16bdca   — light brand, hover states
brand-500: #0694a2   — primary brand
brand-700: #036672   — dark brand, text on light
brand-950: #012a36   — darkest, dark mode backgrounds
```

### Accent (Coral/Red — CTAs, alerts)
```
accent-500: #f05252  — primary CTA, alert badges
accent-600: #e02424  — CTA hover
```

### Recovery (Green — positive health signals)
```
recovery-400: #31c48d  — good HRV, good sleep score
recovery-500: #0e9f6e  — excellent recovery
```

### Warning (Amber — low targets, attention)
```
warning-400: #fbbf24  — soft warning
warning-500: #f59e0b  — strong warning
```

### Semantic
- `--background`: page background
- `--card`: widget/card background
- `--border`: subtle separators
- `--muted`: secondary text, labels
- `--primary`: interactive elements (maps to brand-500)
- `--destructive`: error states (maps to accent-500)

---

## Typography

**Font**: Inter (variable, display: swap)
- H1: 30px / 700 / tracking-tight
- H2: 24px / 700 / tracking-tight
- H3: 18px / 600
- Body: 16px / 400
- Small: 14px / 400
- Caption: 12px / 400 / text-muted-foreground

**Mono** (for numbers/metrics): JetBrains Mono — installed lazily

---

## Spacing

TailwindCSS scale (4px base):
- Padding inner: p-4, p-6
- Card padding: p-6
- Section gap: space-y-6
- Widget grid gap: gap-4
- Container max: max-w-7xl

---

## Component Library

### Primitives (shadcn/ui)
Button, Card, Input, Label, Badge, Progress, Separator, Avatar, Tabs, Dialog, DropdownMenu, Toast, ScrollArea, Select, Tooltip

### NutriCoach Widgets (custom)

**CalorieRing**
- SVG ring showing consumed vs target
- Color: brand when on track, warning when over 90%, destructive when over 100%
- Center: consumed kcal + % of target

**MacroBar**
- Horizontal segmented bar (protein / carbs / fat)
- Each segment colored distinctly
- Shows g and % of target

**StatCard**
- Compact metric display
- Title, value, unit, delta (vs yesterday)
- Trend indicator (arrow up/down, color-coded)

**RecoveryScore**
- Circular score 0–100
- Color: recovery (green) when >70, warning when 40–70, destructive when <40
- Status label: peak / high / moderate / low / very_low

**TrendLine**
- Minimal sparkline for 7-day trend
- Recharts LineChart, no axes, just the line
- Color based on trend direction

**WeightChart**
- Full chart with target weight line
- 30/60/90 day selector
- Moving average overlay

**AIMessageBubble**
- Styled message container
- NutriCoach avatar icon
- Animated typing indicator when streaming

---

## Layout System

### App Shell
```
desktop:
├── Sidebar (fixed, 256px)
└── Main (scrollable)
    └── Container (max-w-7xl, px-4, py-6)

mobile:
├── TopBar (sticky, h-14)
├── Main (scrollable)
│   └── Container (px-4, py-6, pb-20)  ← padding for BottomNav
└── BottomNav (fixed bottom, h-16)
```

### Widget Grid
- 1 column on mobile
- 2 columns on sm (640px+)
- 4 columns on lg (1024px+)
- Dashboard widgets span as needed

### Page Template
```
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Title</h1>
    <p className="text-muted-foreground">Subtitle</p>
  </div>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {widgets}
  </div>
</div>
```

---

## Animation Guidelines

Using Framer Motion:
- Page transitions: fade + slide (0.2s ease)
- Widget entry: staggered fade-in from below
- Number changes: spring animation on value update
- Loading states: shimmer skeleton
- Respect `prefers-reduced-motion` — disable animations if set

```tsx
const variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}
// <motion.div variants={variants} initial="hidden" animate="visible">
```

---

## Dark Mode

Default: follows system preference
Toggle: next-themes ThemeProvider
Classes: `dark` on `<html>`

Dark mode colors are pre-configured in globals.css CSS variables.

---

## Responsive Breakpoints (Tailwind)

| Breakpoint | Width | Use |
|-----------|-------|-----|
| default | 0px+ | Mobile phones |
| sm | 640px+ | Large phones, small tablets |
| md | 768px+ | Tablets, show sidebar |
| lg | 1024px+ | Desktop, 4-column grid |
| xl | 1280px+ | Large desktop |
