// PayFast shared utilities — Phase 4 PAY
// Used by: payfast-itn/index.ts, create-payfast-order/index.ts
// NOTE: Uses npm:md5 — crypto.subtle does NOT support MD5.

import md5 from 'npm:md5'

// ── Constants ─────────────────────────────────────────────────────────────────

export const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'
export const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process'

/**
 * Returns the appropriate PayFast checkout URL based on sandbox flag.
 */
export function getPayFastUrl(sandbox: boolean): string {
  return sandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL
}

// ── Signature generation ──────────────────────────────────────────────────────

/**
 * Generates a PayFast MD5 signature string.
 *
 * Algorithm:
 * 1. Exclude the 'signature' key itself and any keys with empty/undefined values
 * 2. Sort remaining keys alphabetically
 * 3. Encode as key=encodeURIComponent(value).replace(/%20/g, '+')
 * 4. Join with &
 * 5. If passphrase is non-empty, append &passphrase=<encoded-passphrase>
 * 6. MD5 hash the result, return lowercase hex
 *
 * Source: PayFast developer docs + django-payfast/omnipay-payfast reference implementations
 */
export function generatePayFastSignature(
  params: Record<string, string>,
  passphrase: string,
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'signature' && params[k] !== '' && params[k] !== undefined)
    .sort()

  const parts = sortedKeys.map(
    (k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`,
  )

  if (passphrase !== '') {
    parts.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`)
  }

  const pfString = parts.join('&')
  return md5(pfString).toLowerCase()
}

/**
 * Verifies a received PayFast signature by recomputing and comparing.
 *
 * Returns true if the recomputed signature matches the received signature.
 * Comparison is case-insensitive (both lowercased).
 */
export function verifyPayFastSignature(
  params: Record<string, string>,
  receivedSignature: string,
  passphrase: string,
): boolean {
  const computed = generatePayFastSignature(params, passphrase)
  return computed === receivedSignature.toLowerCase()
}

// ── API signature (for PayFast Subscriptions API calls) ───────────────────────

/**
 * Generates a PayFast API signature for subscription management API calls
 * (e.g., cancel subscription endpoint).
 *
 * Uses the same algorithm as generatePayFastSignature — same MD5 approach,
 * but typically called with header params for API authentication.
 */
export function generateApiSignature(
  headerParams: Record<string, string>,
  passphrase: string,
): string {
  return generatePayFastSignature(headerParams, passphrase)
}
