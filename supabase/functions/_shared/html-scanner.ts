// Generated HTML safety scanner — regex-based (Deno-compatible; DOMPurify needs jsdom).
// Pure TypeScript: no Deno imports so it can be unit-tested in Node Vitest.

export interface HtmlScanResult {
  safe: boolean
  violations: string[]
}

const ALLOWED_EXTERNAL_SCRIPT_HOSTS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]

export function scanGeneratedHtml(html: string): HtmlScanResult {
  const violations: string[] = []

  // 1. Any <script> tag (inline or external)
  if (/<script[\s>]/i.test(html)) {
    violations.push('Contains <script> tag')
  }

  // 2. External src= attributes not on allowlist (scan JS specifically)
  const srcMatches = Array.from(html.matchAll(/src\s*=\s*["']([^"']+)["']/gi))
  for (const match of srcMatches) {
    const url = match[1]
    // data: URIs in src
    if (url.toLowerCase().startsWith('data:')) {
      violations.push('Contains data: URI in src attribute')
      continue
    }
    // absolute URLs → check host against allowlist for .js endings
    if (/^https?:\/\//i.test(url)) {
      try {
        const host = new URL(url).hostname
        if (/\.js(\?|$)/i.test(url) && !ALLOWED_EXTERNAL_SCRIPT_HOSTS.includes(host)) {
          violations.push(`External JS from untrusted host: ${host}`)
        }
      } catch {
        violations.push(`Malformed URL in src: ${url}`)
      }
    }
  }

  // 3. Inline event handlers: on\w+=
  if (/\bon[a-z]+\s*=\s*["']/i.test(html)) {
    violations.push('Contains inline event handler (on*=)')
  }

  // 4. javascript: protocol in href or action
  if (/(href|action)\s*=\s*["']\s*javascript:/i.test(html)) {
    violations.push('Contains javascript: protocol in href/action')
  }

  // 5. <iframe> tags
  if (/<iframe[\s>]/i.test(html)) {
    violations.push('Contains <iframe> tag')
  }

  return { safe: violations.length === 0, violations }
}
