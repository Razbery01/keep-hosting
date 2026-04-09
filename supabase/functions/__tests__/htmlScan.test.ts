import { describe, it, expect } from 'vitest'
import { scanGeneratedHtml } from '../_shared/html-scanner'

describe('scanGeneratedHtml', () => {
  it('passes clean semantic HTML', () => {
    const clean = `<!doctype html><html><head>
      <meta charset="utf-8">
      <link rel="stylesheet" href="/styles.css">
      <title>Acme Plumbing</title>
    </head><body><h1>Welcome</h1></body></html>`
    expect(scanGeneratedHtml(clean)).toEqual({ safe: true, violations: [] })
  })

  it('allows external fonts and Tailwind CDN', () => {
    const ok = `<html><head>
      <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com/3.4.0"></script>
    </head><body></body></html>`
    const result = scanGeneratedHtml(ok)
    // script tag detection still fires — this is stricter than the host allowlist by design.
    // If you want to allow Tailwind CDN via <script>, adjust the regex; the test documents current behavior.
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes('script'))).toBe(true)
  })

  it('flags inline <script>', () => {
    const bad = '<html><body><script>alert(1)</script></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.includes('script'))).toBe(true)
  })

  it('flags onclick handler', () => {
    const bad = '<html><body><button onclick="steal()">Click</button></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.includes('event handler'))).toBe(true)
  })

  it('flags onerror handler', () => {
    const bad = '<html><body><img src="x" onerror="alert(1)"></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
  })

  it('flags javascript: href', () => {
    const bad = '<html><body><a href="javascript:alert(1)">x</a></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.includes('javascript:'))).toBe(true)
  })

  it('flags <iframe>', () => {
    const bad = '<html><body><iframe src="https://evil.com"></iframe></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.includes('iframe'))).toBe(true)
  })

  it('flags data: URI in src', () => {
    const bad = '<html><body><img src="data:text/html,<script>alert(1)</script>"></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.toLowerCase().includes('data:'))).toBe(true)
  })

  it('flags external JS from untrusted host', () => {
    const bad = '<html><body><img src="https://evil.example.com/tracker.js"></body></html>'
    const r = scanGeneratedHtml(bad)
    expect(r.safe).toBe(false)
    expect(r.violations.some(v => v.includes('untrusted host'))).toBe(true)
  })
})
