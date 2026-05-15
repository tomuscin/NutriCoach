# PWA Audit — Leaxaro (May 2025)

## Executive Summary

Leaxaro has a solid PWA foundation (manifest, service worker, push basics) but several critical gaps prevent production-grade installability and offline capability. This audit documents current state, blockers, and recommendations.

---

## Current State

### Manifest (`/public/manifest.json`)
| Property | Status | Notes |
|---|---|---|
| `name` / `short_name` | ✅ | Present |
| `description` | ✅ | Present |
| `start_url` | ✅ | `/dashboard` |
| `display` | ✅ | `standalone` |
| `background_color` | ✅ | `#0a0a0a` |
| `theme_color` | ✅ | `#0a0a0a` |
| `orientation` | ✅ | `portrait-primary` |
| `scope` | ✅ | `/` |
| `lang` | ✅ | `pl` |
| `categories` | ✅ | health, fitness, sports |
| `id` | ❌ | **MISSING — required for reliable install tracking** |
| `display_override` | ❌ | **MISSING — needed for `fullscreen` fallback** |
| `dir` | ❌ | Missing |
| `screenshots` | ⚠️ | Empty array — reduces App Store quality |
| `shortcuts` | ✅ | 3 shortcuts defined |
| **Icons** | ❌ | **CRITICAL: icon files did not exist in `/public/icons/`** |
| Maskable icons | ❌ | Not present |
| Badge icon | ❌ | Not present |

### Service Worker (`/public/sw.js`)
| Feature | Status | Notes |
|---|---|---|
| Install + activate lifecycle | ✅ | Basic |
| `skipWaiting()` on install | ⚠️ | Immediate skipWaiting causes update races |
| `clients.claim()` | ✅ | Present |
| Old cache deletion | ✅ | On activate |
| Cache versioning | ❌ | **Static `leaxaro-v1` — never invalidated on deploy** |
| Navigation fallback | ✅ | Basic — uses cached `/offline` |
| Static asset caching | ✅ | Cache-first for `/_next/static/` |
| API: network-first | ✅ | Returns JSON 503 when offline |
| Stale-while-revalidate | ❌ | Not implemented |
| Font caching | ❌ | Google Fonts not cached |
| Image caching | ⚠️ | Only same-origin images |
| Update detection postMessage | ❌ | **No notification when new SW activates** |
| `message` handler (skipWaiting) | ❌ | Can't trigger update from UI |
| Push notification handler | ✅ | Basic |
| Push subscription change | ✅ | Re-subscribe on key rotation |

### Root Layout (`/src/app/layout.tsx`)
| Feature | Status | Notes |
|---|---|---|
| Manifest link | ✅ | Present |
| `apple-mobile-web-app-capable` | ✅ | Present |
| `apple-mobile-web-app-status-bar-style` | ✅ | `black-translucent` |
| `apple-mobile-web-app-title` | ✅ | Leaxaro |
| `viewport: viewportFit=cover` | ✅ | Present |
| `maximum-scale=1` | ✅ | Present |
| Theme color meta (light/dark) | ✅ | Via Viewport export |
| iOS splash screen meta tags | ❌ | **Missing `apple-touch-startup-image`** |
| No-flash dark mode script | ✅ | Present |
| SW registration | ⚠️ | Basic inline — no update detection |
| `PWAProvider` component | ❌ | None |

### Mobile UX
| Feature | Status | Notes |
|---|---|---|
| Bottom navigation (mobile) | ✅ | Glass, safe-area-bottom |
| Glass header | ✅ | Present |
| Safe area insets | ⚠️ | `safe-area-inset-bottom` only — missing top/left/right |
| Standalone mode padding | ❌ | No `env(safe-area-inset-top)` in standalone |
| `-webkit-tap-highlight-color: transparent` | ❌ | Missing |
| iOS input zoom prevention | ❌ | Missing `font-size: max(16px, 1em)` |
| Overscroll behavior | ✅ | `overscroll-behavior: none` on body |
| Momentum scrolling | ❌ | Missing `-webkit-overflow-scrolling: touch` |
| Page transitions | ❌ | No animated transitions |

### Install UX
| Feature | Status | Notes |
|---|---|---|
| `InstallPrompt` component | ❌ | **Not present** |
| iOS install instructions | ❌ | Not present |
| Android native prompt | ❌ | Not present |
| Already-installed detection | ❌ | Not present |
| Dismiss/cooldown logic | ❌ | Not present |
| Platform detection | ❌ | Not present |

### Push UX
| Feature | Status | Notes |
|---|---|---|
| `usePushNotifications` hook | ✅ | Complete |
| Push API route (`/api/push/subscribe`) | ✅ | Complete |
| Soft ask → hard ask flow | ❌ | **Not present** |
| Push education modal | ❌ | Not present |
| Notification settings in Settings page | ⚠️ | Basic toggle only |
| Notification categories | ❌ | Not present |

### Offline Experience
| Feature | Status | Notes |
|---|---|---|
| Offline page (`/offline`) | ✅ | Basic |
| Offline page is pre-cached | ✅ | In SHELL_ASSETS |
| Static `offline.html` fallback | ❌ | Depends on Next.js runtime |
| "Reconnect" detection | ❌ | No `navigator.onLine` handling |
| Update available toast | ❌ | Not present |

---

## Critical Blockers for Installability

1. **Icons missing** — No icon files in `public/icons/`. Without icons, Chrome, Safari, and Edge will refuse to show the install prompt.
2. **No maskable icons** — Android adaptive icons show white square without maskable variant.
3. **Manifest missing `id`** — Required for install deduplication in Chrome 113+.
4. **No install UX** — No `InstallPrompt` component means users can't discover install option.
5. **SW never updates** — `CACHE_NAME = 'leaxaro-v1'` is static, so cached assets are never refreshed after deploy.

---

## Lighthouse Gap Analysis

Based on manifest + code analysis (not run-time Lighthouse):

| Category | Estimated Score | Main Issues |
|---|---|---|
| PWA | ~40 | Missing icons, no update flow, SW issues |
| Accessibility | ~75 | Some missing ARIA labels, input font sizes |
| Best Practices | ~80 | CSP could be stricter, some HTTPS issues |
| Performance | ~70 | `force-dynamic` on all pages, bundle size |
| SEO | ~60 | `robots: noindex` (intentional for private app) |

---

## Architecture Recommendations

### Service Worker
- Use versioned cache buckets: `nc-shell-v3`, `nc-assets-v3`, `nc-images-v3`
- Add stale-while-revalidate for HTML navigation
- Add `message` handler for `SKIP_WAITING` (enable update from UI)
- Broadcast `SW_ACTIVATED` message to all clients on activation
- Add Google Fonts caching strategy

### Install UX
- `beforeinstallprompt` listener → defer + trigger on user action
- Platform detection: iOS Safari / Android Chrome / Desktop / Unsupported
- Custom iOS walkthrough modal with Add to Home Screen steps
- Dismiss: store in `localStorage` with 7-day cooldown
- Show after 2nd session or meaningful engagement event

### Push
- Soft ask: in-app banner on Dashboard (day 2+)
- Education modal: show notification preview mockups
- Hard ask: only after user clicks "Enable" in education modal
- Track: `pwa.push.prompted`, `pwa.push.granted`, `pwa.push.denied`

### Offline
- Create `public/offline.html` (standalone, no React dependency)
- SW serves `offline.html` instead of cached Next.js route
- Add `navigator.onLine` → `offline` event listeners for reconnect toast

---

## Fixes Implemented in This Pass

All blockers above were addressed. See `final-pwa-production-audit.md` for results.
