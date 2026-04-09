# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**AI & Code Generation:**
- Anthropic Claude - Website code generation via multi-agent system
  - SDK/Client: @anthropic-ai/sdk 0.81.0
  - Auth: Env var `ANTHROPIC_API_KEY` (Supabase edge function secret)
  - Models used: claude-sonnet-4-6 with adaptive thinking
  - Used in: `supabase/functions/build-site/index.ts` - Image Agent (search queries), Code Agent (HTML/CSS/JS generation)

**Stock Photography:**
- Pexels API - Professional stock photos sourced via Claude-generated search queries
  - Auth: Env var `PEXELS_API_KEY`
  - Endpoint: `https://api.pexels.com/v1/search`
  - Fallback: Curated Unsplash images by industry if API unavailable
  - Used in: `supabase/functions/build-site/index.ts` - Image Agent

**Domain Availability:**
- Google DNS API - Domain availability checking
  - Endpoint: `https://dns.google/resolve`
  - No auth required (public API)
  - Query type: A records to determine domain availability
  - Used in: `src/hooks/useDomainSearch.ts`

**Git Repository Management:**
- GitHub API - Repository creation and code commits for generated sites
  - SDK/Client: Native fetch (no SDK)
  - Auth: Personal Access Token (Env var `GITHUB_PAT`)
  - Endpoints:
    - `POST /user/repos` - Create repository
    - `POST /repos/{owner}/{repo}/git/blobs` - Create file blobs
    - `POST /repos/{owner}/{repo}/git/trees` - Create tree structure
    - `POST /repos/{owner}/{repo}/git/commits` - Create commits
    - `PATCH /repos/{owner}/{repo}/git/refs/heads/main` - Update refs
  - Target org: Env var `GITHUB_ORG` (defaults to 'Razbery01')
  - Used in: `supabase/functions/build-site/index.ts` - deployToGitHub()

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (admin)
  - Client: @supabase/supabase-js 2.101.1
  - Tables: profiles, orders, client_sites, file_uploads, build_events (see ARCHITECTURE.md for schema)

**File Storage:**
- Supabase Storage - `client-assets` bucket
  - Private bucket for user-uploaded logos, hero images, and brand assets
  - Folder structure: `{user_id}/{file_type}/{file_name}`
  - Used for: Logo URLs, hero images, gallery assets
  - Access: User-scoped with admin override via RLS policies
  - Used in: `src/lib/supabase.ts`, `supabase/functions/build-site/index.ts`

**Caching:**
- None detected - No caching layer implemented

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL auth.users table)
  - Implementation: Supabase built-in auth with email/password
  - Integration: `src/lib/supabase.ts` - Client initialization
  - Hooks: `src/hooks/useAuth.ts` - useAuth() hook with signUp, signIn, signOut, profile fetching
  - Profile sync: Trigger `handle_new_user()` creates profiles table entry on signup
  - Role management: 'client' and 'admin' roles stored in profiles.role column

## Monitoring & Observability

**Error Tracking:**
- None detected - No error tracking service (Sentry, etc.)

**Logs:**
- Supabase build_events table - Application-specific event logging
  - Used in: `supabase/functions/build-site/index.ts`
  - Tracked events: image_agent_start, image_agent_done, code_agent_start, code_agent_done, github_start, github_done, netlify_start, netlify_done, build_error

## CI/CD & Deployment

**Hosting:**
- Netlify - Primary platform for client-generated websites
  - API integration: Netlify PAT (Env var `NETLIFY_PAT`)
  - Endpoints:
    - `POST /api/v1/sites` - Create site with GitHub repo
    - Site configuration: Automatic builds from GitHub repo (branch: main)
  - Naming convention: `kh-{slug}` where slug is sanitized business name
  - Used in: `supabase/functions/build-site/index.ts` - deployToNetlify()
  - Self-hosted on Netlify: Keep Hosting marketing site deployed on Netlify
    - Site ID: d98ab05f-e237-4004-bf40-98d3f1c8d3e8 (`.netlify/state.json`)

**CI Pipeline:**
- None detected - No CI/CD pipeline configured for Keep Hosting repo itself
- Supabase Edge Functions - Deno runtime for serverless functions
  - Location: `supabase/functions/`
  - Functions: build-site (main), domain-search (placeholder)
  - Runtime: TypeScript/Deno with JSR/npm dependencies

## Environment Configuration

**Required env vars (Client - Vite):**
- `VITE_SUPABASE_URL` - Supabase project URL (defaults to hardcoded in `src/lib/supabase.ts`)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (defaults to hardcoded in `src/lib/supabase.ts`)

**Required env vars (Edge Functions - Deno):**
- `ANTHROPIC_API_KEY` - Claude API key (required for code generation)
- `PEXELS_API_KEY` - Pexels API key (optional; falls back to curated images)
- `GITHUB_PAT` - GitHub Personal Access Token (required for repo creation)
- `GITHUB_ORG` - GitHub organization (defaults to 'Razbery01')
- `NETLIFY_PAT` - Netlify Personal Access Token (required for site deployment)
- `SUPABASE_URL` - Supabase project URL (admin access)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

**Secrets location:**
- `.env.example` - Template file with VITE_ variables only
- Production secrets: Supabase Edge Functions secrets management (via Supabase dashboard)
- Hardcoded fallbacks: Supabase URL and anon key in `src/lib/supabase.ts` (acceptable for public data)

## Webhooks & Callbacks

**Incoming:**
- WhatsApp - Business chat button links to WhatsApp
  - Format: `https://wa.me/{SITE_PHONE_E164}`
  - Phone: +27683044916 (hardcoded in `src/lib/constants.ts`)
  - Used in: `src/components/layout/WhatsAppChatButton.tsx`, contact pages

**Outgoing:**
- None detected - No outbound webhooks to external services

## Social & Communication

**Social Media:**
- Client sites support social_links as JSONB field in client_sites table
- Links configurable per site during onboarding
- Supported platforms: Flexible (stored as key-value pairs)

---

*Integration audit: 2026-04-09*
