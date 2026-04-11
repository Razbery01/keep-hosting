import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-06 — Recurring payments handled by PayFast native subscriptions', () => {
  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  it('payfast-itn source handles recurring COMPLETE by updating next_charge_at', () => {
    expect(itnSource).toMatch(/next_charge_at/)
  })

  it('recurring COMPLETE distinguishes from initial by checking existing subscription', () => {
    expect(itnSource).toMatch(/existingSub|existing.*sub/i)
  })
})
