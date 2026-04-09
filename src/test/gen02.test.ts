import { describe, it } from 'vitest'

describe('GEN-02 — ANTHROPIC_API_KEY never in browser bundle', () => {
  it.todo('scans src/ for VITE_ANTHROPIC — must not exist')
  it.todo('scans src/ for import.meta.env.ANTHROPIC_API_KEY — must not exist')
  it.todo('scans src/ for literal "@anthropic-ai/sdk" import — must not exist (only allowed in supabase/functions/)')
})
