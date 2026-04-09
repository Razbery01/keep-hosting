import { describe, it, expect } from 'vitest'
import { scanGeneratedHtml, scanForMobileWarnings } from './html-scanner'

// Note: existing htmlScan.test.ts in supabase/functions/__tests__/ continues to cover the SEC-07 baseline checks.
// This file extends with GEN-04 behaviors added in Plan 02.

describe('html-scanner — GEN-04 viewport meta', () => {
  it('fails when <meta name="viewport"> is missing', () => {
    const result = scanGeneratedHtml('<html><body></body></html>')
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes('viewport'))).toBe(true)
  })

  it('passes when <meta name="viewport" content="width=device-width, initial-scale=1"> is present', () => {
    const html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>'
    const result = scanGeneratedHtml(html)
    // No viewport violation — may still be safe=true if no other issues
    expect(result.violations.some(v => v.includes('viewport'))).toBe(false)
  })

  it('reports missing viewport as a hard error (not a warning)', () => {
    const result = scanGeneratedHtml('<html><head></head><body></body></html>')
    // Hard error: must set safe=false and include in violations array
    expect(result.safe).toBe(false)
    const viewportViolation = result.violations.find(v => v.includes('viewport'))
    expect(viewportViolation).toBeDefined()
  })

  it('viewport check uses case-insensitive regex (uppercase NAME attribute)', () => {
    const html = '<html><head><META NAME="viewport" content="width=device-width"></head><body></body></html>'
    const result = scanGeneratedHtml(html)
    expect(result.violations.some(v => v.includes('viewport'))).toBe(false)
  })

  it('regression: existing SEC-07 script check still rejects <script>alert(1)</script>', () => {
    const html = '<html><head><meta name="viewport" content="width=device-width"></head><body><script>alert(1)</script></body></html>'
    const result = scanGeneratedHtml(html)
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes('script'))).toBe(true)
  })
})

describe('html-scanner — GEN-04 mobile warnings', () => {
  it('reports hardcoded px widths on container selectors as soft warnings', () => {
    const result = scanForMobileWarnings('body { width: 1200px; }')
    expect(result.hardcoded_widths.length).toBeGreaterThan(0)
    expect(result.hardcoded_widths[0]).toContain('1200px')
  })

  it('reports fixed pixel widths on body selector', () => {
    const result = scanForMobileWarnings('body { width: 1200px; }')
    expect(result.hardcoded_widths.some(w => w.toLowerCase().includes('body'))).toBe(true)
  })

  it('reports fixed pixel widths on section selector', () => {
    const result = scanForMobileWarnings('section { width: 800px; }')
    expect(result.hardcoded_widths.length).toBeGreaterThan(0)
    expect(result.hardcoded_widths[0]).toContain('800px')
  })

  it('does NOT warn about percentage widths (.container { width: 100%; })', () => {
    const result = scanForMobileWarnings('.container { width: 100%; }')
    expect(result.hardcoded_widths).toHaveLength(0)
  })

  it('does NOT warn about max-width (max-width: 1200px is allowed)', () => {
    const result = scanForMobileWarnings('main { max-width: 1200px; }')
    expect(result.hardcoded_widths).toHaveLength(0)
  })

  it('does NOT warn about min-width', () => {
    const result = scanForMobileWarnings('section { min-width: 320px; }')
    expect(result.hardcoded_widths).toHaveLength(0)
  })

  it('does not warn about px values used for borders or padding', () => {
    const css = 'body { border: 2px solid red; padding: 16px; }'
    const result = scanForMobileWarnings(css)
    expect(result.hardcoded_widths).toHaveLength(0)
  })

  it('scanForMobileWarnings returns empty array for responsive CSS', () => {
    const css = '.container { width: 100%; max-width: 1200px; padding: 0 1rem; }'
    const result = scanForMobileWarnings(css)
    expect(result.hardcoded_widths).toHaveLength(0)
  })

  it('scanForMobileWarnings does not flip safe — it is a separate type', () => {
    const result = scanForMobileWarnings('body { width: 1200px; }')
    // Returns MobileWarnings, which has no safe property
    expect(result).toHaveProperty('hardcoded_widths')
    expect(result).not.toHaveProperty('safe')
  })
})
