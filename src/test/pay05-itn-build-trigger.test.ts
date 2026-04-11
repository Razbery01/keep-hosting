import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-05 — Initial payment COMPLETE triggers site build via generate-site', () => {
  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  const onboardingSource = fs.existsSync('src/pages/OnboardingPage.tsx')
    ? fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8')
    : ''

  it('payfast-itn source invokes generate-site on initial COMPLETE', () => {
    expect(itnSource).toMatch(/invoke.*generate-site|generate.site/i)
  })

  it('OnboardingPage source does NOT invoke build-site', () => {
    expect(onboardingSource).not.toMatch(/invoke.*build-site/)
  })

  it('OnboardingPage source invokes create-payfast-order', () => {
    expect(onboardingSource).toMatch(/invoke.*create-payfast-order/)
  })
})
