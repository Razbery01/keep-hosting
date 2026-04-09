import { describe, it } from 'vitest'

// Note: existing htmlScan.test.ts in supabase/functions/__tests__/ continues to cover the SEC-07 baseline checks.
// This file extends with GEN-04 behaviors added in Plan 02.

describe('html-scanner — GEN-04 viewport meta', () => {
  it.todo('fails when <meta name="viewport"> is missing')
  it.todo('passes when <meta name="viewport" content="width=device-width, initial-scale=1"> is present')
  it.todo('reports missing viewport as a hard error (not a warning)')
})

describe('html-scanner — GEN-04 mobile warnings', () => {
  it.todo('reports hardcoded px widths on container selectors as soft warnings')
  it.todo('reports fixed pixel widths greater than 400px on block elements')
  it.todo('does not warn about px values used for borders or padding')
})
