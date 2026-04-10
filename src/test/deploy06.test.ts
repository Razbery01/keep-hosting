import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-06 — retry/idempotency', () => {
  const deploySiteSource = fs.readFileSync('supabase/functions/deploy-site/index.ts', 'utf8')
  const orchestratorSource = fs.readFileSync('supabase/functions/build-orchestrator/index.ts', 'utf8')

  it('deploy-site source writes netlify_site_id before zip deploy attempt', () => {
    // netlify_site_id write should appear BEFORE the /deploys POST in source order
    const siteIdWriteIdx = deploySiteSource.indexOf('netlify_site_id')
    const deployPostIdx = deploySiteSource.indexOf('/deploys')
    expect(siteIdWriteIdx).toBeGreaterThan(-1)
    expect(deployPostIdx).toBeGreaterThan(-1)
    expect(siteIdWriteIdx).toBeLessThan(deployPostIdx)
  })

  it('deploy-site source sets deploy_failed on error', () => {
    expect(deploySiteSource).toMatch(/deploy_failed/)
  })

  it('build-orchestrator source includes deploy_failed in status query', () => {
    expect(orchestratorSource).toMatch(/deploy_failed/)
  })
})
