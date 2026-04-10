import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GEN_SITE = resolve(__dirname, '../../supabase/functions/generate-site/index.ts')

describe('GEN-03 — per-package token caps', () => {
  const src = readFileSync(GEN_SITE, 'utf8')

  it('defines PACKAGE_MAX_TOKENS map', () => {
    expect(src).toMatch(/PACKAGE_MAX_TOKENS/)
  })
  // Caps sized for Edge runtime / Haiku; see 02-CONTEXT.md (upgrade with Pro + Sonnet)
  it('starter = 4096', () => { expect(src).toMatch(/starter\s*:\s*4096/) })
  it('professional = 6000', () => { expect(src).toMatch(/professional\s*:\s*6000/) })
  it('enterprise = 8000', () => { expect(src).toMatch(/enterprise\s*:\s*8000/) })
})

describe('GEN-03 — retry ladder', () => {
  const src = readFileSync(GEN_SITE, 'utf8')

  it('defines a callClaudeWithRetry (or equivalent) helper', () => {
    // Match a function with maxRetries parameter
    expect(src).toMatch(/maxRetries\s*=\s*2/)
  })
  it('checks for 429 retryable status', () => { expect(src).toMatch(/status\s*===\s*429/) })
  it('checks for 529 retryable status', () => { expect(src).toMatch(/status\s*===\s*529/) })
  it('checks for 5xx retryable range', () => { expect(src).toMatch(/status\s*>=\s*500/) })
  it('logs retry_scheduled events', () => { expect(src).toMatch(/retry_scheduled/) })
  it('uses exponential backoff base 2000ms', () => { expect(src).toMatch(/2000/) })
})
