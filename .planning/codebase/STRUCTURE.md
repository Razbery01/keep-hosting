# Structure: keep-hosting

Directory layout, key locations, and naming conventions.

## Top-Level Layout

```
keep-hosting/
├── src/                    # All application code
├── public/                 # Static assets served as-is
├── supabase/               # (if present) DB migrations/config
├── index.html              # Vite entry HTML
├── vite.config.ts          # Vite + Tailwind plugin config
├── tsconfig.json           # TS project references
├── tsconfig.app.json       # App TS config (strict)
├── tsconfig.node.json      # Node/tooling TS config
├── eslint.config.js        # Flat ESLint config
├── package.json
└── .planning/              # GSD planning artifacts (this dir)
```

## `src/` Directory

```
src/
├── main.tsx                # App entry — mounts React, wraps in Router
├── App.tsx                 # Root component
├── router.tsx              # Route definitions
├── index.css               # Global styles + Tailwind directives
├── vite-env.d.ts           # Vite type shims
│
├── assets/                 # Static images, SVGs imported by components
│
├── components/
│   └── layout/             # Shell components
│       ├── Layout.tsx          # Wraps all routes — nav + footer
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       └── WhatsAppChatButton.tsx
│
├── pages/                  # Route components (one per page)
│   ├── HomePage.tsx
│   ├── AboutPage.tsx
│   ├── ServicesPage.tsx
│   ├── PricingPage.tsx
│   ├── ContactPage.tsx
│   ├── DomainSearchPage.tsx
│   ├── OnboardingPage.tsx      # Large — ~790 lines, see CONCERNS.md
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── DashboardPage.tsx
│   ├── OrderPage.tsx
│   ├── AdminPage.tsx           # Admin dashboard (see CONCERNS.md)
│   └── AdminOrdersPage.tsx
│
├── hooks/                  # Reusable state/effect logic
│   ├── useAuth.ts              # Supabase auth session hook
│   └── useDomainSearch.ts      # Domain availability via Google DNS
│
├── lib/                    # Integration + utility modules
│   ├── supabase.ts             # Supabase client (see CONCERNS.md re: env)
│   ├── constants.ts            # UPPER_SNAKE_CASE module constants
│   └── utils.ts                # Shared helpers (cn, formatters, etc.)
│
└── types/
    ├── index.ts                # Barrel export
    └── database.ts             # Supabase schema types (generated or hand-written)
```

## Key Locations

| What | Where |
|------|-------|
| App entry | `src/main.tsx` → `src/App.tsx` → `src/router.tsx` |
| Route wrapping | `src/components/layout/Layout.tsx` (nav + footer around every page) |
| New page | Add file in `src/pages/`, register route in `src/router.tsx` |
| New hook | `src/hooks/useXxx.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Shared constants | `src/lib/constants.ts` |
| Global styles | `src/index.css` (Tailwind + custom) |
| Tailwind config | Integrated via `@tailwindcss/vite` plugin in `vite.config.ts` — no separate `tailwind.config.js` |
| TypeScript config | `tsconfig.app.json` (app), `tsconfig.node.json` (tooling) |
| Lint config | `eslint.config.js` (flat config) |

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Page component files | `PascalCasePage.tsx` | `HomePage.tsx`, `OnboardingPage.tsx` |
| Layout/shared components | `PascalCase.tsx` | `Navbar.tsx`, `Footer.tsx` |
| Hooks | `useCamelCase.ts` | `useAuth.ts`, `useDomainSearch.ts` |
| Utilities / lib | `camelCase.ts` | `utils.ts`, `supabase.ts`, `constants.ts` |
| Type files | `camelCase.ts` | `database.ts`, `index.ts` |
| Type identifiers | `PascalCase` | `Order`, `Profile`, `DomainSearchResult` |
| Module-level constants | `UPPER_SNAKE_CASE` | `DEFAULT_EXTENSIONS`, `SITE_PHONE_E164` |
| Functions / handlers | `camelCase` | `handleSubmit`, `searchDomain`, `fetchProfile` |

## Import Conventions

- **Relative imports only** — no path aliases (`@/`) configured.
  ```ts
  import { supabase } from '../lib/supabase'
  import { useAuth } from '../hooks/useAuth'
  ```
- External packages first, then local imports, then type-only imports.
- Single-quote strings.

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build + `@tailwindcss/vite` plugin |
| `tsconfig.json` | Root — project references |
| `tsconfig.app.json` | Strict TS config for `src/` |
| `tsconfig.node.json` | TS config for Vite/Node tooling |
| `eslint.config.js` | Flat ESLint config |
| `package.json` | Deps + scripts (`dev`, `build`, `lint`, `preview`) |
| `.env` (not committed) | Supabase URL + anon key (see CONCERNS.md) |

## Where To Put New Code

- **New page:** `src/pages/NewThingPage.tsx` + register in `src/router.tsx`
- **New reusable UI component:** `src/components/` (create subfolder if grouped) — currently only `layout/` exists
- **New hook:** `src/hooks/useNewThing.ts`
- **New Supabase query helper:** Either inline in the consuming hook/page, or extract to `src/lib/` if reused
- **New constant:** `src/lib/constants.ts`
- **New type:** `src/types/database.ts` (if DB-related) or `src/types/index.ts`
