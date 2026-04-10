import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-02 — UUID-based site naming', () => {
  const source = fs.readFileSync('supabase/functions/deploy-site/index.ts', 'utf8')

  it('deploy-site creates site with kh-{8chars} name pattern', () => {
    expect(source).toMatch(/kh-.*slice\(0,\s*8\)/)
  })

  it('deploy-site uses team account endpoint with NETLIFY_TEAM_SLUG', () => {
    expect(source).toMatch(/NETLIFY_TEAM_SLUG.*sites|teamSlug.*sites/)
  })
})
