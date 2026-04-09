import { describe, it, expect } from 'vitest'
import { SONNET_4_6_PRICING, calcCostUsd, usdToZar } from './cost-calc'

describe('cost-calc — GEN-07 cost calculation', () => {
  it('SONNET_4_6_PRICING constants match 02-RESEARCH.md source', () => {
    expect(SONNET_4_6_PRICING.input_per_mtok).toBe(3.00)
    expect(SONNET_4_6_PRICING.output_per_mtok).toBe(15.00)
    expect(SONNET_4_6_PRICING.cache_read_per_mtok).toBe(0.30)
    expect(SONNET_4_6_PRICING.cache_write_5m_per_mtok).toBe(3.75)
    expect(SONNET_4_6_PRICING.cache_write_1h_per_mtok).toBe(6.00)
    expect(SONNET_4_6_PRICING.usd_to_zar).toBe(18.85)
    expect(SONNET_4_6_PRICING.model).toBe('claude-sonnet-4-6')
    expect(SONNET_4_6_PRICING.pricing_date).toBe('2026-04-09')
  })

  it('calcCostUsd computes input+output+cache costs at Sonnet 4.6 rates', () => {
    // 1M input tokens at $3/Mtok = $3.00
    expect(calcCostUsd({ input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(3.00, 4)
    // 1M output tokens at $15/Mtok = $15.00
    expect(calcCostUsd({ input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(15.00, 4)
    // 1M cache read tokens at $0.30/Mtok = $0.30
    expect(calcCostUsd({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.30, 4)
    // 1M cache creation tokens at $3.75/Mtok = $3.75
    expect(calcCostUsd({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000 })).toBeCloseTo(3.75, 4)
  })

  it('calcCostUsd handles cache_read_input_tokens separately from input_tokens', () => {
    const cacheReadOnly = calcCostUsd({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 })
    const inputOnly = calcCostUsd({ input_tokens: 1_000_000, output_tokens: 0 })
    // cache read is 10% of input cost: 0.30 vs 3.00
    expect(cacheReadOnly).toBeCloseTo(0.30, 4)
    expect(inputOnly).toBeCloseTo(3.00, 4)
    expect(cacheReadOnly).toBeLessThan(inputOnly)
  })

  it('calcCostUsd returns 0 for zero tokens', () => {
    expect(calcCostUsd({ input_tokens: 0, output_tokens: 0 })).toBe(0)
  })

  it('calcCostUsd typical Starter build (3500 input + 12000 output) ≈ $0.1905', () => {
    // input: 3500/1M * 3.00 = 0.0105
    // output: 12000/1M * 15.00 = 0.18
    // total: 0.1905
    expect(calcCostUsd({ input_tokens: 3500, output_tokens: 12000 })).toBeCloseTo(0.1905, 4)
  })

  it('usdToZar applies hardcoded 18.85 rate and rounds to 2 decimals', () => {
    expect(usdToZar(1)).toBe(18.85)
    expect(usdToZar(0)).toBe(0)
  })

  it('usdToZar(0.1905) returns 3.59', () => {
    expect(usdToZar(0.1905)).toBe(3.59)
  })

  it('usdToZar rounds to 2 decimals', () => {
    // 0.1234567 * 18.85 = 2.3276... → 2.33
    const result = usdToZar(0.1234567)
    expect(result).toBe(Math.round(0.1234567 * 18.85 * 100) / 100)
    // verify result has at most 2 decimal places
    expect(result.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})
