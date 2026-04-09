import { describe, it } from 'vitest'

describe('GEN-03 — per-package token caps', () => {
  it.todo('starter package uses max_tokens=12000')
  it.todo('professional package uses max_tokens=24000')
  it.todo('enterprise package uses max_tokens=48000')
})

describe('GEN-03 — retry ladder', () => {
  it.todo('retries on 429 up to 2 times with exponential backoff')
  it.todo('retries on 529 up to 2 times')
  it.todo('retries on 5xx up to 2 times')
  it.todo('does NOT retry on 400 — fails loudly immediately')
  it.todo('does NOT retry on 401/403 — fails loudly immediately')
  it.todo('caps at 2 retries total (3 attempts) then throws')
})
