import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GEN_SITE = resolve(__dirname, '../../supabase/functions/generate-site/index.ts')

describe('GEN-01 — tool_choice forced tool use', () => {
  const src = readFileSync(GEN_SITE, 'utf8')

  it('Code Agent uses tool_choice with deliver_site_files tool name', () => {
    expect(src).toMatch(/tool_choice\s*:\s*\{\s*type\s*:\s*['"]tool['"]\s*,\s*name\s*:\s*['"]deliver_site_files['"]/)
  })

  it('Image Agent uses tool_choice with deliver_search_queries tool name', () => {
    expect(src).toMatch(/tool_choice\s*:\s*\{\s*type\s*:\s*['"]tool['"]\s*,\s*name\s*:\s*['"]deliver_search_queries['"]/)
  })

  it('does NOT set thinking parameter (incompatible with forced tool_choice)', () => {
    expect(src).not.toMatch(/thinking\s*:\s*\{/)
  })

  it('does NOT contain regex fallback for files JSON parsing', () => {
    expect(src).not.toMatch(/textBlock\.text\.match\s*\(\s*\/\\?\{\[\\s\\S\]\*"files"/)
  })

  it('does NOT contain regex fallback for image queries JSON parsing', () => {
    expect(src).not.toMatch(/textBlock\.text\.match\s*\(\s*\/\\?\[\[\\s\\S\]\*\\?\]/)
  })

  it('extracts files via tool_use block pattern', () => {
    expect(src).toMatch(/content\.find\s*\(\s*\(\s*b[^)]*\)\s*=>\s*b\.type\s*===\s*['"]tool_use['"]/)
  })

  it('imports buildCodeAgentPrompt from _shared/prompts', () => {
    expect(src).toMatch(/from\s+['"]\.\.\/_shared\/prompts/)
  })
})
