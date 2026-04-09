# Concerns: keep-hosting

Technical debt, known issues, and fragile areas discovered during codebase mapping.

## Security Risks

### Hardcoded / Exposed Credentials
- **Location:** `src/lib/supabase.ts`
- **Issue:** Supabase URL and anon key have plaintext JWT fallback values committed in source. Anon key in a public repo is technically safe (RLS should protect data), but the pattern invites leaking the service role key the same way later.
- **Action:** Move to `.env`, document required env vars in README, verify RLS policies cover every table.

### Unprotected Admin Routes
- **Location:** `/admin`, `/admin/orders` (check `src/App.tsx` routing + any admin pages)
- **Issue:** No role verification before rendering admin pages or running admin queries. Any authenticated user can load admin UI.
- **Action:** Add role check (admin flag on profile or RLS-backed role table). Gate route + every query used by admin pages.

### File Upload Vulnerabilities
- **Location:** `src/pages/OnboardingPage.tsx` (image upload handlers)
- **Issues:**
  - No file type validation (user could upload any MIME type)
  - No file size limit
  - Upload path uses raw filename → potential path traversal / overwrite on Supabase Storage
- **Action:** Validate MIME type + extension, cap size (e.g. 5 MB), rename to UUID before upload.

### Missing Input Sanitization
- **Location:** All form pages (Contact, Onboarding, Sign Up)
- **Issue:** No XSS protection on user-supplied content that later gets rendered (especially in LivePreview where content comes straight from state).
- **Action:** Sanitize rich text output, escape HTML in preview renderer, rely on React's default escaping where possible.

### Contact Form Silently Discards Data
- **Location:** `src/pages/ContactPage.tsx` lines 10–16
- **Issue:** Handler accepts submission but never persists anywhere — user sees success toast, message is lost.
- **Action:** Insert into Supabase `contact_messages` table, or POST to email/webhook.

---

## Technical Debt

### Monolithic Components
- **`src/pages/OnboardingPage.tsx`** — ~790 lines. Handles auth, form state, domain search, image upload, build polling, and preview in one file.
- **Action:** Extract into smaller components + custom hooks (`useOnboardingForm`, `useDomainSearch`, `useBuildStatus`).

### Swallowed Errors
- **Location:** `src/pages/OnboardingPage.tsx` line ~197 — `.catch(() => {})`
- **Issue:** Build-trigger errors are hidden from user and logs. Failures look indistinguishable from success.
- **Action:** Surface error via toast, log to observability (Sentry or even console in dev).

### Polling Without Cleanup Discipline
- **Locations:** Build status polling and domain search polling use `setInterval` every 3 s
- **Issues:** Not all intervals are cleared on unmount consistently; can leak timers on navigation and continue hitting the backend.
- **Action:** Refactor to use `useEffect` with strict cleanup, or move to Supabase realtime subscriptions.

### No Error Logging Strategy
- **Issue:** Only `toast.error(...)` notifications — nothing captured centrally. Production errors are invisible.
- **Action:** Add Sentry (or similar) + structured logging helper.

### Inconsistent Error Handling
- **Issue:** Mix of try/catch, `.then/.catch`, and silent failures across files.
- **Action:** Establish a single error-handling convention and document it in `CONVENTIONS.md`.

### Unreliable Domain Availability Check
- **Location:** Domain search uses Google public DNS (`dns.google`)
- **Issue:** DNS presence ≠ registerability. Unregistered domains can have DNS, registered domains may not. False positives/negatives are expected.
- **Action:** Integrate proper WHOIS / registrar API (Porkbun, Namecheap, etc.) before launch.

---

## Fragile Areas

### Auth/Submit Race Condition
- **Location:** `src/pages/OnboardingPage.tsx`
- **Issue:** Uses `setTimeout` before `handleSubmit` to wait for auth state — timing-dependent, will break under slow networks.
- **Action:** Await the session directly (`supabase.auth.getSession()` or listen for `SIGNED_IN` event) instead of sleeping.

### Admin Query Trust Boundary
- **Issue:** Admin pages call queries assuming RLS will block non-admins, but UI renders optimistically. If RLS misses a policy, data leaks client-side.
- **Action:** Server-side enforcement + role check before query + tests for each admin table's RLS.

### Build-Status Desync
- **Issue:** Frontend polls order status independently; no source of truth reconciliation.
- **Action:** Use Supabase realtime channel on `orders` row, fall back to polling.

---

## Performance Issues

### Unbounded Build Logs
- **Issue:** Build log state grows forever during long builds, no cap, no virtualization.
- **Action:** Cap to last N lines (e.g. 500), or virtualize display.

### Aggressive Polling
- **Issue:** 3 s interval is faster than Supabase realtime would be and multiplies requests across tabs.
- **Action:** Switch to realtime subscriptions; keep polling only as fallback at 10 s+.

### LivePreview Re-renders
- **Location:** Onboarding LivePreview component
- **Issue:** Re-renders the entire preview DOM on every keystroke — noticeable jank on slower machines.
- **Action:** Debounce input (150–300 ms), memoize preview subtree, or iframe-isolate.

### Domain Search: No Cache, No Debounce
- **Issue:** Every keystroke fires a DNS request; repeated lookups for the same string.
- **Action:** Add `useDebounce` (300 ms) + in-memory cache keyed by domain.

---

## Test Coverage

**Zero.** No test framework (Jest, Vitest, Playwright) configured. No test files in the repo. This is the single biggest risk before shipping paid features. See `TESTING.md` for details.

---

## Missing Critical Features

These are absent from the current implementation and will block launch:

- **Payment processing** — orders change status but no actual charge (Stripe/etc.)
- **Email notifications** — no transactional email on signup, order, build complete
- **Domain registration integration** — search exists, but no registrar API wired up
- **Analytics / observability** — nothing tracking funnel drop-off or errors

---

## Priority Summary

**Must fix before launch (blockers):**
1. Admin route authorization
2. File upload validation
3. Payment integration
4. Move credentials fully to env + verify RLS on every table
5. Real domain registrar integration (not DNS-based)

**Should fix soon (fragility):**
6. Error logging / observability
7. Auth/submit race condition
8. Test framework + baseline coverage
9. Component extraction from OnboardingPage

**Nice to have:**
10. Polling → realtime subscriptions
11. LivePreview debounce/memoization
12. Domain search caching
