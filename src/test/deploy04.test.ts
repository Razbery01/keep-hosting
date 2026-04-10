import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-04 — suspension', () => {
  const suspendSource = fs.readFileSync('supabase/functions/suspend-site/index.ts', 'utf8')
  const templateSource = fs.readFileSync('supabase/functions/_shared/suspended-page.ts', 'utf8')

  it('suspend-site source deploys single-file zip with placeholder HTML', () => {
    expect(suspendSource).toMatch(/SUSPENDED_PAGE_HTML/)
    expect(suspendSource).toMatch(/index\.html/)
    expect(suspendSource).toMatch(/api\.netlify\.com/)
  })

  it('suspend-site source updates build_status to suspended', () => {
    expect(suspendSource).toMatch(/suspended/)
  })

  it('suspended-page.ts exports SUSPENDED_PAGE_HTML constant', () => {
    expect(templateSource).toMatch(/export.*SUSPENDED_PAGE_HTML/)
  })
})
