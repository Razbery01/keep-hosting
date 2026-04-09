/**
 * cost-calc.ts — Anthropic Claude Sonnet 4.6 cost calculation utilities
 *
 * Pricing source: https://platform.claude.com/docs/en/about-claude/pricing
 * Verified: 2026-04-09
 *
 * ZAR rate (18.85) is intentionally hardcoded per 02-CONTEXT.md decision:
 * "Exchange rate API is not worth the infra here. Admin dashboard (Phase 6) can
 * show 'ZAR values assume USD/ZAR = 18.85 as of 2026-04-09'."
 * Update this constant when Phase 6 admin swaps in a live rate feed.
 *
 * Pure TypeScript: NO Deno imports — importable in Node Vitest AND Deno Edge Functions.
 */

export const SONNET_4_6_PRICING = {
  input_per_mtok:            3.00,  // USD per million input tokens
  output_per_mtok:          15.00,  // USD per million output tokens
  cache_read_per_mtok:       0.30,  // USD per million cache-read tokens (10% of input)
  cache_write_5m_per_mtok:   3.75,  // USD per million cache-creation tokens (5-minute TTL)
  cache_write_1h_per_mtok:   6.00,  // USD per million cache-creation tokens (1-hour TTL)
  tool_system_prompt_tokens: 313,   // Forced tool_choice overhead (from 02-RESEARCH.md)
  usd_to_zar:               18.85,  // Hardcoded at 2026-04-09 per 02-CONTEXT.md decision
  model:                    'claude-sonnet-4-6' as const,
  pricing_date:             '2026-04-09' as const,
} as const

export interface ClaudeUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

/**
 * Calculate the USD cost of a Claude API call.
 * Uses 5-minute cache write rate (cache_write_5m_per_mtok) for cache_creation_input_tokens.
 */
export function calcCostUsd(usage: ClaudeUsage): number {
  const input = (usage.input_tokens / 1_000_000) * SONNET_4_6_PRICING.input_per_mtok
  const output = (usage.output_tokens / 1_000_000) * SONNET_4_6_PRICING.output_per_mtok
  const cacheRead = ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * SONNET_4_6_PRICING.cache_read_per_mtok
  const cacheWrite = ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * SONNET_4_6_PRICING.cache_write_5m_per_mtok
  return input + output + cacheRead + cacheWrite
}

/**
 * Convert USD cost to South African Rand.
 * Applies hardcoded rate (see module header) and rounds to 2 decimal places.
 */
export function usdToZar(usd: number): number {
  return Math.round(usd * SONNET_4_6_PRICING.usd_to_zar * 100) / 100
}
