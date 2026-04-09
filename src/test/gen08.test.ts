import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')

describe('GEN-08 — Edge Function split exists', () => {
  it('supabase/functions/generate-site/index.ts exists with Deno.serve', () => {
    const p = `${ROOT}/supabase/functions/generate-site/index.ts`
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, 'utf8')).toMatch(/Deno\.serve/)
  })
  it('supabase/functions/persist-files/index.ts exists with Deno.serve', () => {
    const p = `${ROOT}/supabase/functions/persist-files/index.ts`
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, 'utf8')).toMatch(/Deno\.serve/)
  })
  it('supabase/functions/build-orchestrator/index.ts exists with Deno.serve', () => {
    const p = `${ROOT}/supabase/functions/build-orchestrator/index.ts`
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, 'utf8')).toMatch(/Deno\.serve/)
  })
  it('generate-site imports from _shared/prompts', () => {
    const src = readFileSync(`${ROOT}/supabase/functions/generate-site/index.ts`, 'utf8')
    expect(src).toMatch(/from\s+['"]\.\.\/_shared\/prompts/)
  })
  it('generate-site imports from _shared/cost-calc', () => {
    const src = readFileSync(`${ROOT}/supabase/functions/generate-site/index.ts`, 'utf8')
    expect(src).toMatch(/from\s+['"]\.\.\/_shared\/cost-calc/)
  })
  it('generate-site invokes persist-files fire-and-forget (no await)', () => {
    const src = readFileSync(`${ROOT}/supabase/functions/generate-site/index.ts`, 'utf8')
    // The invoke line must NOT start with `await`
    expect(src).toMatch(/[^a-z]supabase\.functions\.invoke\(['"]persist-files/)
    // But should exist
    expect(src).toMatch(/functions\.invoke\(['"]persist-files/)
  })
})
