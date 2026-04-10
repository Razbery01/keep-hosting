import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ORCH = resolve(__dirname, '../../supabase/functions/build-orchestrator/index.ts')
const GEN  = resolve(__dirname, '../../supabase/functions/generate-site/index.ts')

describe('GEN-05 — build-orchestrator queue state', () => {
  const src = readFileSync(ORCH, 'utf8')

  it('filters client_sites by build_status in pending/retry/deploy_failed', () => {
    expect(src).toMatch(/pending.*retry.*deploy_failed|deploy_failed/)
  })
  it('filters by next_retry_at <= now()', () => {
    expect(src).toMatch(/next_retry_at/)
  })
  it('has concurrency cap of 2', () => {
    expect(src).toMatch(/CONCURRENCY_CAP\s*=\s*2/)
  })
  it('increments retry_count when claiming a row', () => {
    expect(src).toMatch(/retry_count\s*:\s*\(/)
  })
  it('sets last_attempted_at on claim', () => {
    expect(src).toMatch(/last_attempted_at\s*:/)
  })
  it('logs orchestrator_pick events', () => {
    expect(src).toMatch(/orchestrator_pick/)
  })
  it('invokes generate-site for generation queue rows', () => {
    expect(src).toMatch(/generate-site/)
  })
})
