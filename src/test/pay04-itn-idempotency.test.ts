import { describe, it } from 'vitest'

describe('PAY-04 — ITN handler is idempotent on duplicate notifications', () => {
  it.todo('payfast-itn source checks m_payment_id before processing')
  it.todo('duplicate COMPLETE ITN returns 200 without double-processing')
})
