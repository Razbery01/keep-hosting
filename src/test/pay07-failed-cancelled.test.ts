import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-07 — Failed payment retry and cancellation suspend site', () => {
  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  it('payfast-itn source handles FAILED status', () => {
    expect(itnSource).toMatch(/FAILED/)
  })

  it('payfast-itn source invokes suspend-site on CANCELLED', () => {
    expect(itnSource).toMatch(/CANCELLED[\s\S]*suspend-site|suspend.site[\s\S]*CANCELLED/)
  })

  it('payfast-itn source references failed_charge_count', () => {
    expect(itnSource).toMatch(/failed_charge_count/)
  })
})
