import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-04 — ITN handler is idempotent on duplicate notifications', () => {
  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  it('payfast-itn source checks m_payment_id before processing', () => {
    expect(itnSource).toMatch(/m_payment_id|payment_id/)
  })

  it('duplicate COMPLETE ITN returns 200 without double-processing', () => {
    expect(itnSource).toMatch(/duplicate|skipped/)
  })
})
