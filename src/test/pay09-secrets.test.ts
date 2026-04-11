import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function getAllTsFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath)
    }
  }
  return files
}

describe('PAY-09 — PayFast secrets stay server-side; webhook endpoint is public', () => {
  it('PAYFAST_PASSPHRASE does not appear in any src/ TypeScript file (excluding test files)', () => {
    // Exclude src/test/ to prevent self-referential false positives (same pattern as deploy01.test.ts bundle scan)
    const srcFiles = getAllTsFiles('src').filter(f => !f.includes('/test/') && !f.includes('\\test\\'))
    const violations: string[] = []
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8')
      if (content.includes('PAYFAST_PASSPHRASE')) {
        violations.push(file)
      }
    }
    expect(violations).toEqual([])
  })

  it('payfast-itn config.toml sets verify_jwt = false', () => {
    const configPath = 'supabase/config.toml'
    if (!fs.existsSync(configPath)) return
    const config = fs.readFileSync(configPath, 'utf8')
    // config.toml must have the payfast-itn section with verify_jwt = false
    expect(config).toMatch(/\[functions\.payfast-itn\]/)
    expect(config).toMatch(/verify_jwt\s*=\s*false/)
  })
})
