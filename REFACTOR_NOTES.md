# Smart Combo — Refactored Frontend

This is the Phase 1 refactor of the Smart Combo store. The visual design and theme
are unchanged. What changed is the **architecture**: the codebase is now ready for
backend integration, multiple combos, and real e-commerce flows.

## What's new

### 1. Index.tsx is no longer a 704-line monolith
It's now ~80 lines that orchestrate 10 small section components in `client/sections/`.
Each section reads its data via props.

### 2. All hardcoded data has moved to a typed data layer
- `client/types/` — TypeScript interfaces matching future MongoDB schemas
- `client/data/` — current hardcoded values, properly typed
- `client/api/` — stub functions that today read from `data/`, tomorrow will fetch from your backend

When the backend lands, you change one line per file in `client/api/*.ts` (uncomment the `apiFetch` call,
delete the import from `data/`). Section components, types, and pages don't change.

### 3. Cart system (Zustand)
- `client/stores/cart.ts` — cart state with localStorage persistence
- `client/components/shared/CartDrawer.tsx` — slide-out cart UI
- Header cart icon now actually works and shows item count

### 4. Settings context
- `client/contexts/SettingsContext.tsx` — `SettingsProvider` + `useSettings()`
- WhatsApp number, contact info, hero slides, promo timer, video URL all come from here
- Single place to update — no more searching through multiple files

### 5. Real pages instead of "Coming Soon" placeholders
- **Checkout** — full form with 4 payment options (Paystack, Flutterwave, bank transfer, COD for Ilorin)
- **OrderTracking** — real lookup form with status timeline (will throw until backend exists; that's intentional)
- **Contact** — WhatsApp / phone / email / location cards
- **Products** — listing page that loops over all active combos
- **AdminDashboard** — skeleton showing structure (needs backend + auth)
- **FAQ, Shipping, Returns, Privacy, Terms** — proper content pages
- **Dashboard** — placeholder until customer auth is built

### 6. SEO + meta tags
- `react-helmet-async` is now wired up via `<SEO>` component
- Each page sets its own title/description/OG tags
- WhatsApp/Facebook share previews will work properly

### 7. Error boundary
Top-level `<ErrorBoundary>` catches crashes and shows a friendly fallback UI.

### 8. Bug fixes from the original
- ❌ Auto-opening video modal removed (was killing conversion)
- ❌ Rickroll placeholder URL still in `data/settings.ts` — **REPLACE BEFORE LAUNCH**
- ❌ Broken Footer WhatsApp link (`https://wa.me/234`) fixed — now uses settings
- ❌ Cart icon in header had no onClick — now opens cart drawer
- ❌ Promo countdown still resets on refresh in this version (will be fixed when backend stores `promoEndsAt`)

## Setup

```bash
pnpm install        # or npm install
pnpm dev            # starts dev server on http://localhost:8080
pnpm typecheck      # verify TypeScript
pnpm build          # production build
```

New dependencies added:
- `zustand` — cart state
- `react-helmet-async` — SEO meta tags

## Before launch — manual edits required

Open `client/data/settings.ts` and update:

```ts
const WHATSAPP_NUMBER = '+2348000000000';   // ← real number
//   ...
email: 'support@smartcombo.ng',             // ← real email
phone: '+234 (0) 123 456 7890',             // ← real phone
//   ...
video: {
  url: 'https://www.youtube.com/embed/...', // ← real demo video (currently a Rickroll placeholder)
  ...
},
```

## Project structure

```
client/
├── api/                    ← API call abstraction (stubs today, real fetch tomorrow)
├── components/
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── shared/             ← cross-cutting components
│   │   ├── CartDrawer.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── InfoPageLayout.tsx
│   │   ├── ProductImageSlider.tsx
│   │   └── SEO.tsx
│   └── ui/                 ← shadcn/ui (unchanged)
├── contexts/
│   └── SettingsContext.tsx
├── data/                   ← hardcoded data (delete when backend lands)
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── useCountdown.ts
├── lib/
│   ├── format.ts           ← formatNaira, calculateSavings
│   └── utils.ts
├── pages/                  ← route components
├── sections/               ← homepage sections (extracted from old Index.tsx)
├── stores/
│   └── cart.ts             ← Zustand cart store
├── types/                  ← match future MongoDB schemas
├── App.tsx
└── global.css
```

## Phase 2 — backend (next)

When you're ready to wire up the backend, the work is roughly:

1. **MongoDB schemas** matching the types in `client/types/` (combos, settings, testimonials, faqs, orders, customers, users)
2. **Express routes** in `server/routes/` (one file per resource — combos.ts, settings.ts, orders.ts, etc.)
3. **Replace stubs** in `client/api/*.ts` with real `apiFetch()` calls
4. **Auth** — JWT-based admin auth, then customer auth later
5. **Cloudinary** integration for combo images uploaded from admin panel
6. **Paystack + Flutterwave** integration with webhooks for order confirmation
7. **Wire `AdminDashboard.tsx`** to real CRUD endpoints
8. **Wire `Dashboard.tsx`** to customer auth + order history

Each step is small and focused. The frontend won't need restructuring — only the
internals of `client/api/*.ts` will change.
