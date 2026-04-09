import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SRC_DIR = resolve(__dirname, '..')  // src/

function walkSrc(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      // Skip test directory — this file lives in src/test and would self-match
      if (entry === 'test' || entry === '__tests__' || entry === 'node_modules') continue
      out.push(...walkSrc(full))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('GEN-02 — ANTHROPIC_API_KEY never in browser bundle', () => {
  const files = walkSrc(SRC_DIR)

  it('discovers source files to scan', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('no src file references VITE_ANTHROPIC', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      if (/VITE_ANTHROPIC/.test(src)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })

  it('no src file references import.meta.env.ANTHROPIC_API_KEY', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      if (/import\.meta\.env\.ANTHROPIC_API_KEY/.test(src)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })

  it('no src file imports @anthropic-ai/sdk (SDK is server-side only)', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      if (/from\s+['"]@anthropic-ai\/sdk['"]/.test(src)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })
})

describe('GEN-09 — DashboardPage regression', () => {
  it('DashboardPage.tsx no longer contains setInterval(fetchLogs, 3000)', () => {
    const src = readFileSync(
      resolve(__dirname, '../pages/DashboardPage.tsx'),
      'utf8',
    )
    expect(src).not.toMatch(/setInterval\s*\(\s*fetchLogs\s*,\s*3000/)
  })

  it('DashboardPage.tsx imports useBuildStatus', () => {
    const src = readFileSync(
      resolve(__dirname, '../pages/DashboardPage.tsx'),
      'utf8',
    )
    expect(src).toMatch(/useBuildStatus/)
  })
})
