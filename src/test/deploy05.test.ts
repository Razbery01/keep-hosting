import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-05 — reactivation', () => {
  const source = fs.readFileSync('supabase/functions/reactivate-site/index.ts', 'utf8')

  it('reactivate-site source reads files from Supabase Storage', () => {
    expect(source).toMatch(/client-sites/)
    expect(source).toMatch(/\.list\(|\.download\(/)
  })

  it('reactivate-site source does not invoke generate-site or Claude', () => {
    expect(source.toLowerCase()).not.toMatch(/generate-site/)
    expect(source.toLowerCase()).not.toMatch(/anthropic/)
    expect(source.toLowerCase()).not.toMatch(/claude/)
  })

  it('reactivate-site source updates build_status to deployed', () => {
    expect(source).toMatch(/deployed/)
  })
})
