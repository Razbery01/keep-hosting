# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- TypeScript 5.9.3 - Frontend application and edge functions
- JavaScript (ES2023) - Runtime standard

**Secondary:**
- SQL - Supabase PostgreSQL migrations and RLS policies
- HTML5 - Generated output for client websites

## Runtime

**Environment:**
- Node.js (v20+, inferred from package.json)

**Package Manager:**
- npm
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- React 19.2.4 - UI framework and component library
- React Router DOM 7.13.2 - Client-side routing
- Vite 8.0.1 - Build tool and dev server
- React Hook Form 7.72.0 - Form state management

**Testing:**
- None detected - No test framework configured

**Build/Dev:**
- Vite (@vitejs/plugin-react 6.0.1) - React JSX support
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- @tailwindcss/vite 4.2.2 - Vite plugin for Tailwind
- TypeScript 5.9.3 - Type checking and compilation
- ESLint 9.39.4 - Code linting
- TypeScript ESLint 8.57.0 - TypeScript support for ESLint

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.101.1 - PostgreSQL database and auth client
- @anthropic-ai/sdk 0.81.0 - Claude AI integration for website generation
- zod 4.3.6 - Runtime schema validation

**UI/UX:**
- framer-motion 12.38.0 - Animation and motion library
- lucide-react 1.7.0 - Icon library (SVG)
- sonner 2.0.7 - Toast notifications
- tailwind-merge 3.5.0 - Utility class composition

**Forms:**
- @hookform/resolvers 5.2.2 - Integration between react-hook-form and validation libraries
- clsx 2.1.1 - Conditional className utilities

## Configuration

**Environment:**
- Vite environment variables (VITE_* prefix)
- `.env.example` present with Supabase configuration
- Runtime reads: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Supabase Edge Functions read additional env vars: `ANTHROPIC_API_KEY`, `GITHUB_PAT`, `GITHUB_ORG`, `NETLIFY_PAT`, `PEXELS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Build:**
- `vite.config.ts` - Vite configuration with React and Tailwind plugins
- `tsconfig.json` - Project TypeScript configuration with composite reference pattern
- `tsconfig.app.json` - App-specific TypeScript config (ES2023, strict mode enabled, JSX: react-jsx)
- `tsconfig.node.json` - Node environment TypeScript config
- `eslint.config.js` - ESLint flat config with React hooks and refresh rules

## Platform Requirements

**Development:**
- Node.js 20+
- npm 9+
- TypeScript 5.9.3
- For Supabase development: Supabase CLI (implicit from `supabase/` directory)

**Production:**
- Netlify - Primary deployment platform (Netlify API integration)
- Supabase - PostgreSQL database and auth backend
- GitHub - Repository hosting for generated client sites
- Pexels - Stock photography API for website generation
- Anthropic Claude - AI-powered website code generation via edge functions

---

*Stack analysis: 2026-04-09*
