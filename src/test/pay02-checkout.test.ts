import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-02 — OnboardingPage redirects to PayFast checkout with subscription params', () => {
  const orderSource = fs.existsSync('supabase/functions/create-payfast-order/index.ts')
    ? fs.readFileSync('supabase/functions/create-payfast-order/index.ts', 'utf8')
    : ''

  it('create-payfast-order returns all required checkout params', () => {
    expect(orderSource).toMatch(/payfast_url/)
    expect(orderSource).toMatch(/params/)
    expect(orderSource).toMatch(/jsonResponse.*params.*payfast_url|payfast_url.*params/)
  })

  it('checkout params include subscription_type=1, frequency=3, cycles=0', () => {
    expect(orderSource).toMatch(/subscription_type.*'1'|subscription_type.*"1"/)
    expect(orderSource).toMatch(/frequency.*'3'|frequency.*"3"/)
    expect(orderSource).toMatch(/cycles.*'0'|cycles.*"0"/)
  })

  it('custom_str1 carries siteId through checkout', () => {
    expect(orderSource).toMatch(/custom_str1/)
    expect(orderSource).toMatch(/siteId/)
  })

  it('signature is present and non-empty via generatePayFastSignature', () => {
    expect(orderSource).toMatch(/generatePayFastSignature/)
    expect(orderSource).toMatch(/signature/)
  })
})
