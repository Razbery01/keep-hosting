# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** React + TypeScript SPA with Vite, using client-side routing and serverless Supabase backend with Edge Functions for build orchestration.

**Key Characteristics:**
- Frontend: React 19 + React Router v7 for client-side routing with Layout-based composition
- Backend: Supabase (PostgreSQL database + Auth + Storage + Edge Functions running on Deno)
- Build Pipeline: Multi-agent system using Claude API to generate HTML websites, deploy to GitHub, and Netlify
- Styling: Tailwind CSS v4 with theme configuration, Framer Motion for animations, Lucide React for icons
- State Management: React hooks for local state, Supabase client for remote state, form state via React Hook Form
- Type Safety: Full TypeScript with Zod for runtime validation of user inputs

## Layers

**Presentation Layer (UI Components):**
- Purpose: Render pages and interactive components for users
- Location: `src/components/`, `src/pages/`
- Contains: React components (pages, layout components, shared UI elements)
- Depends on: Hooks layer, lib utilities, Framer Motion, Lucide React icons
- Used by: React Router for rendering via `<Outlet />`

**Routing Layer:**
- Purpose: Define application routes and render appropriate pages
- Location: `src/router.tsx`
- Contains: Route configuration using `createBrowserRouter` with nested Layout
- Depends on: React Router, page components
- Used by: `App.tsx` via `RouterProvider`

**Hooks Layer (Business Logic):**
- Purpose: Encapsulate reusable stateful logic and data fetching
- Location: `src/hooks/`
- Contains: Custom React hooks (`useAuth`, `useDomainSearch`)
- Depends on: Supabase client, React Hooks (useState, useEffect, useCallback)
- Used by: Page components for authentication, domain lookup, and build event polling

**Integration Layer (API Clients):**
- Purpose: Abstract external services and database access
- Location: `src/lib/supabase.ts`
- Contains: Supabase client initialization with environment variables
- Depends on: @supabase/supabase-js SDK
- Used by: Hooks and page components for queries, mutations, auth state

**Type & Constants Layer:**
- Purpose: Define shared types, enums, and configuration constants
- Location: `src/types/`, `src/lib/constants.ts`, `src/lib/utils.ts`
- Contains: TypeScript interfaces (OnboardingData, Order, Profile, Database schema), service definitions, pricing packages, industry categories, color presets
- Depends on: Zod for runtime schema validation
- Used by: All layers for type safety and configuration

**Serverless Backend (Edge Functions):**
- Purpose: Execute long-running, side-effect operations outside the browser
- Location: `supabase/functions/`
- Contains: Deno-based TypeScript Edge Functions that run on Supabase
- Depends on: Anthropic SDK, GitHub API, Netlify API, Pexels API, Supabase Admin Client
- Triggers: HTTP POST requests from client

**Database Layer:**
- Purpose: Persistent storage for users, orders, sites, uploads, and build events
- Location: `supabase/migrations/` (schema definitions not in src)
- Contains: PostgreSQL tables (profiles, orders, client_sites, file_uploads, build_events)
- Accessed via: Supabase client with RLS policies for multi-tenant security

## Data Flow

**Onboarding & Site Generation Flow:**

1. **User Registration** → SignUp page calls `useAuth().signUp()` → Supabase Auth creates user & fires `auth.onAuthStateChange` → `useAuth` updates user and fetches profile
2. **Onboarding Submission** → OnboardingPage collects business data, uploads files to Supabase Storage → creates `orders` and `client_sites` records
3. **Build Initiation** → Client calls Supabase Edge Function `build-site` with siteId
4. **Image Agent** → Edge Function calls Claude API to generate Pexels search queries → fetches images from Pexels API or uses curated fallbacks
5. **Code Agent** → Edge Function calls Claude API with full site context (business info, images, brand colors) → Claude returns JSON with HTML files
6. **GitHub Deployment** → Edge Function creates GitHub repo, commits generated HTML via GitHub API
7. **Netlify Deployment** → Edge Function creates Netlify site linked to GitHub repo, auto-deploys on push
8. **Event Logging** → Each step inserts record into `build_events` table for client-side polling
9. **Client Polling** → Dashboard page's `BuildProgress` component polls `build_events` every 3 seconds, displays step progress, shows build logs

**Authentication Flow:**

1. `App.tsx` renders `RouterProvider` with routes
2. Each route renders `Layout` component
3. `Layout` renders `Navbar` which calls `useAuth()`
4. `useAuth` hooks into Supabase auth state on mount: `supabase.auth.getSession()` + `onAuthStateChange` listener
5. If session exists, fetches user profile from `profiles` table
6. Navbar conditionally renders Login/SignUp or Dashboard/Admin links based on `user` and `profile.role`
7. Protected routes (Dashboard, Admin) check `user` existence client-side

**Domain Search Flow:**

1. DomainSearchPage calls `useDomainSearch().searchDomain(query)`
2. Hook parses domain, extracts SLD and TLD
3. Queries DNS using Google Public DNS API for each TLD variant
4. Returns availability results for `['co.za', 'com', 'org.za', 'net', 'web.za']` or custom TLD
5. Results trigger pre-fill of domain in onboarding via URL params

**State Management:**

- **Local Component State:** useState for UI state (form inputs, modal visibility, step tracking, animation states)
- **Global Auth State:** Supabase client maintains session in localStorage; `useAuth` syncs it to React state
- **Remote Server State:** Supabase subscriptions and queries for orders, sites, build events, profiles
- **Form State:** React Hook Form + Zod validation in OnboardingPage for multi-step form

## Key Abstractions

**useAuth Hook:**
- Purpose: Centralized authentication and user profile management
- Location: `src/hooks/useAuth.ts`
- Pattern: Custom hook returning `{ user, profile, loading, signUp, signIn, signOut, isAdmin }`
- Used by: Navbar, LoginPage, SignUpPage, OnboardingPage, DashboardPage, AdminDashboard, AdminOrders

**useDomainSearch Hook:**
- Purpose: Encapsulate domain availability checking logic
- Location: `src/hooks/useDomainSearch.ts`
- Pattern: Custom hook returning `{ results, loading, error, searchDomain }`
- Calls: Google Public DNS API for each TLD variant

**BuildProgress Component:**
- Purpose: Reusable display of site build progress with real-time event logging
- Location: Inline in `src/pages/DashboardPage.tsx`
- Pattern: Polls Supabase `build_events` table every 3 seconds, displays visual progress bar + event log
- State: Local state for logs and log visibility

**Onboarding Multi-Step Form:**
- Purpose: Collect business info, design preferences, and upload assets
- Location: `src/pages/OnboardingPage.tsx`
- Pattern: Controlled form state with Zod validation, step-based UI with AnimatePresence
- Flow: 3 steps (Business, Style, Details) with auth check at final submission

**Layout Wrapper:**
- Purpose: Consistent header, footer, toast, and WhatsApp button across all pages
- Location: `src/components/layout/Layout.tsx`
- Pattern: Wraps routes using React Router's `<Outlet />`
- Contains: Fixed `Navbar`, main content area, `Footer`, `WhatsAppChatButton`, Sonner toast container

## Entry Points

**Client Application:**
- Location: `src/main.tsx`
- Triggers: Browser page load, mounts React app to `#root` element
- Responsibilities: Initialize React, render App component with StrictMode

**App Component:**
- Location: `src/App.tsx`
- Triggers: Called by main.tsx
- Responsibilities: Render RouterProvider with configured router

**Router:**
- Location: `src/router.tsx`
- Defines: 12 routes nested under Layout (home, services, pricing, domains, about, contact, login, signup, onboarding, dashboard, admin, admin/orders)

**Edge Functions:**
- Location: `supabase/functions/build-site/index.ts`, `supabase/functions/domain-search/index.ts`
- Triggers: HTTP POST requests from client
- Responsibilities: Orchestrate build pipeline and domain lookup

## Error Handling

**Strategy:** Mixed approach — client-side validation for forms, try-catch with error toast notifications, Supabase RLS for database security, Edge Function error responses with status codes.

**Patterns:**

- **Form Validation:** Zod schemas with React Hook Form integration; display inline validation errors
- **API Errors:** Catch error responses, log to toast via Sonner (`toast.error()`)
- **Async Operations:** useCallback/useEffect error states, displayed in UI (e.g., "Domain search failed", "Build failed")
- **Build Failures:** Edge Function catches errors, logs to `build_events` table with "error" status, updates `client_sites.build_status = 'failed'`
- **Auth Errors:** useAuth returns `error` from signUp/signIn, caller displays via toast
- **Network Fallbacks:** Image Agent falls back to curated images if Pexels API unavailable or no API key
- **Graceful Degradation:** DomainSearchPage handles DNS query failures by returning `available: false` for that TLD

## Cross-Cutting Concerns

**Logging:** No centralized logging framework; build events logged to Supabase `build_events` table by Edge Functions; client-side errors logged via toast + console. Comments in code for complex logic (e.g., build-site function agents).

**Validation:** 
- Frontend: React Hook Form + Zod for onboarding form; manual checks in hooks (e.g., domain format validation)
- Database: Supabase RLS policies (not visible in codebase) enforce row-level access control
- Edge Functions: Input validation at function entry (e.g., `if (!siteId)` in build-site)

**Authentication:**
- Supabase Auth handles JWT tokens, stored in browser localStorage
- Profiles table tracks role (`client` or `admin`)
- Pages check `useAuth().user` to protect routes (client-side guards)
- Admin pages check `useAuth().isAdmin` flag
- No middleware or route guards — reliant on client-side checks

---

*Architecture analysis: 2026-04-09*
