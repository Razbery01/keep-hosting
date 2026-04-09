import { describe, it, expect } from 'vitest'
import { CODE_AGENT_SYSTEM, buildCodeAgentPrompt } from './prompts'

describe('prompts — CODE_AGENT_SYSTEM prompt', () => {
  it('CODE_AGENT_SYSTEM is a non-trivial string (> 3000 chars)', () => {
    expect(typeof CODE_AGENT_SYSTEM).toBe('string')
    expect(CODE_AGENT_SYSTEM.length).toBeGreaterThan(3000)
  })

  it('CODE_AGENT_SYSTEM contains mobile-responsive enforcement line', () => {
    expect(CODE_AGENT_SYSTEM).toContain('responsive')
    expect(CODE_AGENT_SYSTEM).toContain('Never use hardcoded pixel widths')
  })

  it('CODE_AGENT_SYSTEM requires <meta name=viewport> in every HTML file', () => {
    expect(CODE_AGENT_SYSTEM).toContain('viewport')
    // should include the actual meta tag instruction
    expect(CODE_AGENT_SYSTEM).toMatch(/meta[^a-z]*name[^a-z]*viewport/i)
  })

  it('CODE_AGENT_SYSTEM contains {industry_hints} placeholder slot', () => {
    expect(CODE_AGENT_SYSTEM).toContain('{industry_hints}')
  })

  it('CODE_AGENT_SYSTEM does NOT contain "Return ONLY a JSON object" (Plan 04 uses tool_choice)', () => {
    expect(CODE_AGENT_SYSTEM).not.toContain('Return ONLY a JSON object')
  })

  it('CODE_AGENT_SYSTEM does NOT contain "CRITICAL: The JSON must be parseable"', () => {
    expect(CODE_AGENT_SYSTEM).not.toContain('CRITICAL: The JSON must be parseable')
  })

  it('CODE_AGENT_SYSTEM preserves DESIGN PHILOSOPHY section', () => {
    expect(CODE_AGENT_SYSTEM).toContain('DESIGN PHILOSOPHY')
  })

  it('CODE_AGENT_SYSTEM preserves LAYOUT & COMPONENTS section', () => {
    expect(CODE_AGENT_SYSTEM).toContain('LAYOUT & COMPONENTS')
  })

  it('CODE_AGENT_SYSTEM preserves IMAGE HANDLING section', () => {
    expect(CODE_AGENT_SYSTEM).toContain('IMAGE HANDLING')
  })

  it('CODE_AGENT_SYSTEM preserves COPYWRITING section', () => {
    expect(CODE_AGENT_SYSTEM).toContain('COPYWRITING')
  })

  it('CODE_AGENT_SYSTEM preserves SEO OPTIMIZATION section', () => {
    expect(CODE_AGENT_SYSTEM).toContain('SEO OPTIMIZATION')
  })

  it('buildCodeAgentPrompt injects {industry_hints} slot with provided hints', () => {
    const result = buildCodeAgentPrompt({ industry: 'plumber' })
    // slot must be replaced
    expect(result).not.toContain('{industry_hints}')
    // plumber-specific hint content must appear
    expect(result).toContain('emergency callouts')
  })

  it('buildCodeAgentPrompt accepts industry argument and falls back for unknown', () => {
    const result = buildCodeAgentPrompt({ industry: 'unknown' })
    // slot must be replaced even for unknown industries
    expect(result).not.toContain('{industry_hints}')
    // 'other' fallback hint content
    expect(result).toContain('Get in touch')
  })

  it('buildCodeAgentPrompt never leaves literal {industry_hints} in output', () => {
    const industries = ['plumber', 'restaurant', 'lawyer', 'unknown', '', 'beauty']
    for (const industry of industries) {
      const result = buildCodeAgentPrompt({ industry })
      expect(result).not.toContain('{industry_hints}')
    }
  })
})
