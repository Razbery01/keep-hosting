import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-03 — rate limiting', () => {
  const source = fs.readFileSync('supabase/functions/deploy-site/index.ts', 'utf8')

  it('deploy-site source checks build_events for per-minute rate limit', () => {
    expect(source).toMatch(/deploy_done/)
    expect(source).toMatch(/60[_\s]*000|60000|oneMinuteAgo/i)
  })

  it('deploy-site source checks build_events for per-day rate limit', () => {
    expect(source).toMatch(/86[_\s]*400[_\s]*000|86400000|oneDayAgo/i)
  })

  it('deploy-site source logs deploy_quota_warning at 80/day threshold', () => {
    expect(source).toMatch(/deploy_quota_warning/)
    expect(source).toMatch(/80/)
  })
})
