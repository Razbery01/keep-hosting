import { describe, it, expect } from 'vitest'
import { INDUSTRY_HINTS, getIndustryHints } from './industry-hints'

describe('industry-hints — GEN-06 hint map', () => {
  it('returns hints for plumber', () => {
    const hints = getIndustryHints('plumber')
    expect(hints).toBe(INDUSTRY_HINTS.plumber)
    expect(hints.copy_hints).toContain('24/7 emergency callouts')
    expect(hints.copy_hints).toContain('call-out fee transparency')
    expect(hints.copy_hints).toContain('service areas in the city')
    expect(hints.cta_examples).toContain('Call now for emergencies')
    expect(hints.cta_examples).toContain('Get a free quote')
    expect(hints.section_priority[0]).toBe('hero with phone CTA')
  })

  it('returns hints for electrician', () => {
    const hints = getIndustryHints('electrician')
    expect(hints).toBe(INDUSTRY_HINTS.electrician)
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns hints for restaurant', () => {
    const hints = getIndustryHints('restaurant')
    expect(hints).toBe(INDUSTRY_HINTS.restaurant)
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns hints for lawyer', () => {
    const hints = getIndustryHints('lawyer')
    expect(hints).toBe(INDUSTRY_HINTS.lawyer)
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns hints for consultant', () => {
    const hints = getIndustryHints('consultant')
    expect(hints).toBe(INDUSTRY_HINTS.consultant)
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns hints for trades-general', () => {
    const hints = getIndustryHints('trades-general')
    expect(hints).toBe(INDUSTRY_HINTS['trades-general'])
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns hints for beauty', () => {
    const hints = getIndustryHints('beauty')
    expect(hints).toBe(INDUSTRY_HINTS.beauty)
    expect(hints.copy_hints.length).toBeGreaterThanOrEqual(3)
    expect(hints.cta_examples.length).toBeGreaterThanOrEqual(2)
    expect(hints.section_priority.length).toBeGreaterThanOrEqual(3)
  })

  it('returns neutral fallback for unknown industry', () => {
    const hints = getIndustryHints('not-a-real-industry')
    expect(hints).toBe(INDUSTRY_HINTS.other)
  })

  it('returns other fallback for empty string', () => {
    const hints = getIndustryHints('')
    expect(hints).toBe(INDUSTRY_HINTS.other)
  })

  it('all 8 industry keys exist in INDUSTRY_HINTS', () => {
    const requiredKeys = ['plumber', 'electrician', 'restaurant', 'lawyer', 'consultant', 'trades-general', 'beauty', 'other']
    for (const key of requiredKeys) {
      expect(INDUSTRY_HINTS).toHaveProperty(key)
    }
  })

  it('all hint values are non-empty strings', () => {
    for (const [, hints] of Object.entries(INDUSTRY_HINTS)) {
      expect(hints.copy_hints.length).toBeGreaterThan(0)
      expect(hints.cta_examples.length).toBeGreaterThan(0)
      expect(hints.section_priority.length).toBeGreaterThan(0)
      for (const item of [...hints.copy_hints, ...hints.cta_examples, ...hints.section_priority]) {
        expect(typeof item).toBe('string')
        expect(item.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('hint map keys are all lowercase', () => {
    for (const key of Object.keys(INDUSTRY_HINTS)) {
      expect(key).toBe(key.toLowerCase())
    }
  })

  it('getIndustryHints does lowercase matching (Plumber returns plumber hints)', () => {
    // Case-insensitive: 'Plumber' lowercased to 'plumber'
    const hints = getIndustryHints('Plumber')
    expect(hints).toBe(INDUSTRY_HINTS.plumber)
  })

  it('no hints contain hardcoded SA locations (no Cape Town or Johannesburg)', () => {
    const saLocations = ['Cape Town', 'Johannesburg', 'Pretoria', 'Durban', 'Port Elizabeth']
    for (const [, hints] of Object.entries(INDUSTRY_HINTS)) {
      for (const item of [...hints.copy_hints, ...hints.cta_examples, ...hints.section_priority]) {
        for (const location of saLocations) {
          expect(item).not.toContain(location)
        }
      }
    }
  })
})
