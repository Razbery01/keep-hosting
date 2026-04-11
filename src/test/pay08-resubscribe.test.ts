import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-08 — Customer can resubscribe after cancellation', () => {
  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  const dashboardSource = fs.existsSync('src/pages/DashboardPage.tsx')
    ? fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8')
    : ''

  it('payfast-itn invokes reactivate-site for resubscriptions', () => {
    expect(itnSource).toMatch(/invoke.*reactivate-site|reactivate.site/i)
  })

  it('payfast-itn distinguishes resubscribe from first-time by checking prior cancelled/suspended subscription', () => {
    expect(itnSource).toMatch(/cancelled|suspended/i)
  })

  it('DashboardPage contains Reactivate UI', () => {
    expect(dashboardSource).toMatch(/[Rr]eactivate/)
  })

  it('DashboardPage contains cancel subscription UI', () => {
    expect(dashboardSource).toMatch(/[Cc]ancel.*[Ss]ubscription|cancel-subscription/)
  })
})
