# Conventions: keep-hosting

Code style, naming, patterns, and error handling observed across `src/`.

## Language & Strictness

- **TypeScript strict mode** enabled in `tsconfig.app.json`
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all on
- React 18+ with new JSX transform (no `import React` needed)
- No Prettier — formatting enforced only by ESLint defaults + habit
- **2-space indentation**
- **Single quotes** for strings; backticks for templates
- Trailing commas in multi-line literals

## Naming

| Item | Convention |
|------|-----------|
| React components | `PascalCase` — `Navbar`, `LoginPage`, `Footer` |
| Page files | `PascalCasePage.tsx` — `HomePage.tsx`, `OnboardingPage.tsx` |
| Hooks | `useCamelCase.ts` / `useCamelCase` — `useAuth`, `useDomainSearch` |
| Utility modules | `camelCase.ts` — `utils.ts`, `constants.ts`, `supabase.ts` |
| Functions / handlers | `camelCase` — `handleSubmit`, `searchDomain`, `fetchProfile` |
| Module constants | `UPPER_SNAKE_CASE` — `DEFAULT_EXTENSIONS`, `SITE_PHONE_E164`, `SITE_TEL_HREF` |
| Types & interfaces | `PascalCase` — `Order`, `Profile`, `DomainSearchResult` |
| Boolean vars | Prefix `is`/`has`/`should` — `isLoading`, `hasError` |

## Imports

- **Relative imports only** — no path aliases configured.
  ```ts
  import { supabase } from '../lib/supabase'
  import { useAuth } from '../hooks/useAuth'
  ```
- Ordering convention (not lint-enforced, but consistent):
  1. External packages (`react`, `react-router-dom`, `framer-motion`, `lucide-react`, `sonner`)
  2. Local modules (hooks, lib, components)
  3. Type-only imports (`import type { ... }`)

## React Patterns

- **Function components only** — no class components
- **Hooks for state/effects** — `useState`, `useEffect`, `useMemo`, plus custom hooks in `src/hooks/`
- Components receive props via destructuring in the signature
- No prop-types — TypeScript interfaces instead
- Event handlers named `handleX` (e.g. `handleSubmit`, `handleChange`)
- Conditional rendering via ternaries or `&&` — no wrapper `<If>` components
- Animation via `framer-motion` `motion.*` elements
- Toast notifications via `sonner` — `toast.success(...)`, `toast.error(...)`

## Supabase Usage

- Single client exported from `src/lib/supabase.ts`
- Queries inlined where used (no dedicated repository layer)
- Destructure `{ data, error }` on every call:
  ```ts
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    toast.error(error.message)
    return
  }
  ```
- Auth accessed via `useAuth` hook, not direct `supabase.auth.*` calls in components (mostly)

## Error Handling Pattern

Dominant pattern:

```ts
try {
  const { data, error } = await supabase.from('x').select()
  if (error) throw error
  // use data
} catch (err) {
  const message = err instanceof Error ? err.message : 'Something went wrong'
  toast.error(message)
}
```

**Inconsistencies observed** (see CONCERNS.md):
- Some places `.catch(() => {})` swallow errors silently
- Mix of `try/catch` and `.then/.catch` styles
- No central error logging — only user-facing toasts

## Styling

- **Tailwind CSS** via `@tailwindcss/vite` plugin (no separate config file)
- Utility classes directly on JSX — no CSS modules, no styled-components
- `cn()` helper (in `src/lib/utils.ts`) for conditional class merging
- Global styles in `src/index.css`
- Icons from `lucide-react` — imported per-component

## State Management

- **Local state** (`useState`) for component-scoped state
- **Custom hooks** for cross-component logic (`useAuth`, `useDomainSearch`)
- **No global store** (no Redux, Zustand, Jotai, Context) — auth state is the only "global" and it's re-subscribed in `useAuth`
- URL params via `react-router-dom` `useSearchParams` / `useParams`

## Async / Side Effects

- `async/await` preferred over `.then` chains
- `useEffect` for side effects; most are keyed on specific state deps
- Polling via `setInterval` in effects — cleanup discipline is inconsistent (see CONCERNS.md)

## File Structure per Module

A typical page file:

```tsx
// src/pages/ExamplePage.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ExamplePage() {
  const { user } = useAuth()
  const [data, setData] = useState<SomeType | null>(null)

  useEffect(() => {
    // fetch
  }, [user])

  const handleSubmit = async () => {
    try {
      // ...
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <motion.div>...</motion.div>
  )
}
```

## ESLint Rules (from `eslint.config.js`)

Flat config using:
- `@eslint/js` — recommended JS rules
- `typescript-eslint` — recommended TS rules
- `eslint-plugin-react-hooks` — rules of hooks + exhaustive-deps
- `eslint-plugin-react-refresh` — ensures HMR compatibility

Notable implications:
- Unused vars fail the build
- Hook dependencies are checked (though some components disable per-line)

## What's NOT Used

- Prettier
- Path aliases (`@/`)
- CSS modules / CSS-in-JS
- Redux / Zustand / Context for global state
- A dedicated API client layer (queries are inline)
- Prop-types (TS handles this)
- Class components
- Decorators
