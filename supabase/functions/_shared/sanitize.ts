// Prompt injection mitigation — stripped & length-capped user input for Claude prompts.
// Source: OWASP LLM Prompt Injection Prevention Cheat Sheet.
// This file MUST be pure TypeScript (no Deno imports) so it can be unit-tested in Node Vitest
// AND still imported from the build-site Edge Function via a relative path.

const MAX_LENGTHS: Record<string, number> = {
  business_name: 80,
  tagline: 120,
  description: 500,
  about_text: 800,
  services_text: 800,
  goals: 300,
}
const DEFAULT_MAX_LENGTH = 500

/**
 * Sanitize a user-supplied string before interpolating into a Claude prompt.
 * Does NOT attempt to be a full XSS sanitizer — it neutralizes prompt-injection vectors
 * (control characters, HTML-looking tokens, escape sequences, backticks) and enforces length.
 */
export function sanitizeForPrompt(value: string, field: string): string {
  const maxLen = MAX_LENGTHS[field] ?? DEFAULT_MAX_LENGTH
  // eslint-disable-next-line no-control-regex
  return value
    .slice(0, maxLen)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\\/g, '')
    .replace(/`/g, "'")
    .trim()
}
