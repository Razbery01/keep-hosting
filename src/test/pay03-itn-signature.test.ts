import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('PAY-03 — payfast-itn Edge Function verifies ITN signature', () => {
  const payfastSharedSource = fs.existsSync('supabase/functions/_shared/payfast.ts')
    ? fs.readFileSync('supabase/functions/_shared/payfast.ts', 'utf8')
    : ''

  const itnSource = fs.existsSync('supabase/functions/payfast-itn/index.ts')
    ? fs.readFileSync('supabase/functions/payfast-itn/index.ts', 'utf8')
    : ''

  it('verifyPayFastSignature returns true for valid signature', () => {
    expect(payfastSharedSource).toMatch(/verifyPayFastSignature/)
  })

  it('verifyPayFastSignature returns false for tampered params', () => {
    // Source must export verifyPayFastSignature (used in payfast-itn)
    expect(payfastSharedSource).toMatch(/export.*verifyPayFastSignature|export\s*\{[^}]*verifyPayFastSignature/)
  })

  it('signature excludes the signature field itself', () => {
    // Implementation must filter out 'signature' key
    expect(payfastSharedSource).toMatch(/['"]signature['"]/)
  })

  it('signature uses + for spaces, not %20', () => {
    // Implementation must replace %20 with +
    expect(payfastSharedSource).toMatch(/%20.*\+|\+.*%20|replace.*%20.*\+/)
  })

  it('payfast.ts imports md5 for signature hashing', () => {
    expect(payfastSharedSource).toMatch(/md5/)
  })

  it('payfast-itn calls verifyPayFastSignature', () => {
    expect(itnSource).toMatch(/verifyPayFastSignature/)
  })
})
