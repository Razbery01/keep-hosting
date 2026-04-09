import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('CUST-05 — OnboardingPage.tsx source regression', () => {
  it('contains no setTimeout(() => handleSubmit) pattern', () => {
    const source = readFileSync(
      resolve(__dirname, '../pages/OnboardingPage.tsx'),
      'utf8',
    )
    // Negative assertion — the band-aid must be gone
    expect(source).not.toMatch(/setTimeout\s*\(\s*\(\s*\)\s*=>\s*handleSubmit/)
    expect(source).not.toMatch(/setTimeout\s*\(\s*handleSubmit/)
  })

  it('contains await handleSubmit() in the handleAuth success path', () => {
    const source = readFileSync(
      resolve(__dirname, '../pages/OnboardingPage.tsx'),
      'utf8',
    )
    expect(source).toMatch(/await\s+handleSubmit\s*\(\s*\)/)
  })
})
