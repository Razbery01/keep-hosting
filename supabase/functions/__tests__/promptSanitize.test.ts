import { describe, it, expect } from 'vitest'
import { sanitizeForPrompt } from '../_shared/sanitize'

describe('sanitizeForPrompt', () => {
  it('passes clean text through unchanged (except trimming)', () => {
    expect(sanitizeForPrompt('Acme Plumbing Services', 'business_name')).toBe('Acme Plumbing Services')
  })

  it('strips angle brackets', () => {
    expect(sanitizeForPrompt('We fix <script>alert(1)</script> pipes', 'description'))
      .toBe('We fix scriptalert(1)/script pipes')
  })

  it('strips control characters', () => {
    expect(sanitizeForPrompt('Line1\x00Line2\x1FLine3', 'description')).toBe('Line1 Line2 Line3')
  })

  it('replaces backticks with single quotes', () => {
    expect(sanitizeForPrompt('Use `ignore previous instructions`', 'description'))
      .toBe("Use 'ignore previous instructions'")
  })

  it('strips backslashes', () => {
    expect(sanitizeForPrompt('Escape\\nhere', 'description')).toBe('Escapenhere')
  })

  it('enforces business_name max length 80', () => {
    const long = 'x'.repeat(200)
    expect(sanitizeForPrompt(long, 'business_name').length).toBe(80)
  })

  it('enforces description max length 500', () => {
    const long = 'x'.repeat(1000)
    expect(sanitizeForPrompt(long, 'description').length).toBe(500)
  })

  it('uses default 500 for unknown field', () => {
    const long = 'x'.repeat(1000)
    expect(sanitizeForPrompt(long, 'unknown_field').length).toBe(500)
  })

  it('is idempotent', () => {
    const input = 'Text with <tags> and `quotes`'
    const once = sanitizeForPrompt(input, 'description')
    const twice = sanitizeForPrompt(once, 'description')
    expect(once).toBe(twice)
  })

  it('trims whitespace', () => {
    expect(sanitizeForPrompt('  hello world  ', 'description')).toBe('hello world')
  })
})
