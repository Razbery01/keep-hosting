import { describe, it, expect } from 'vitest'
import { scanGeneratedHtml } from '../_shared/html-scanner'

/** Minimal viewport meta — required since GEN-04 */
const VP = '<meta name="viewport" content="width=device-width, initial-scale=1">'

describe('scanGeneratedHtml', () => {
  it('passes clean semantic HTML (with viewport meta — GEN-04 requires it)', () => {
    const clean = `<!doctype html><html><head>
      <meta charset="utf-8">
      ${VP}
      <link rel="stylesheet" href="/styles.css">
      <title>Acme Plumbing</title>
    </head><body><h1>Welcome</h1></body></html>`
    expect(scanGeneratedHtml(clean)).toEqual({ safe: true, violations: [] })
  })

  it('allows external fonts, Tailwind CDN script, and allowlisted hosts (Phase 2)', () => {
    const ok = `<html><head>
      ${VP}
      <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com/3.4.0"></script>
    </head><body></body></html>`
    const result = scanGeneratedHtml(ok)
    expect(result.safe).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('allows inline <script> when viewport present (Phase 2 — Claude uses inline JS for menus etc.)', () => {
    const html = `<html><head>${VP}</head><body><script>alert(1)</script></body></html>`
    const r = scanGeneratedHtml(html)
    expect(r.safe).toBe(true)
    expect(r.violations).toHaveLength(0)
  })

  it('allows onclick handler when viewport present (Phase 2 relaxation)', () => {
    const html = `<html><head>${VP}</head><body><button onclick="steal()">Click</button></body></html>`
    const r = scanGeneratedHtml(html)
    expect(r.safe).toBe(true)
    expect(r.violations).toHaveLength(0)
  })

  it('fails when viewport missing even if other markup looks fine', () => {
    const bad = '<html><body><img src="x" onerror="alert(1)"></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some((v) => v.includes('viewport'))).toBe(true)
  })

  it('flags javascript: href', () => {
    const bad = `<html><head>${VP}</head><body><a href="javascript:alert(1)">x</a></body></html>`
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some((v) => v.includes('javascript:'))).toBe(true)
  })

  it('flags <iframe>', () => {
    const bad = `<html><head>${VP}</head><body><iframe src="https://evil.com"></iframe></body></html>`
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some((v) => v.includes('iframe'))).toBe(true)
  })

  it('flags large data: URI in src (>200 chars)', () => {
    const payload = 'x'.repeat(220)
    const bad = `<html><head>${VP}</head><body><img src="data:text/plain,${payload}"></body></html>`
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some((v) => v.toLowerCase().includes('data:'))).toBe(true)
  })

  it('flags external JS from untrusted host', () => {
    const bad = `<html><head>${VP}</head><body><img src="https://evil.example.com/tracker.js"></body></html>`
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some((v) => v.includes('untrusted host'))).toBe(true)
  })
})
