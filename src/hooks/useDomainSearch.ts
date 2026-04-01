import { useState } from 'react'
import type { DomainSearchResult } from '../types'

const DEFAULT_EXTENSIONS = ['co.za', 'com', 'org.za', 'net', 'web.za']

export function useDomainSearch() {
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function searchDomain(query: string) {
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const cleaned = query.replace(/^https?:\/\//, '').replace(/\/+$/, '').trim()
      if (!cleaned) throw new Error('Please enter a domain name')

      const parts = cleaned.split('.')
      const sld = parts[0]
      const inputTld = parts.length > 1 ? parts.slice(1).join('.') : null
      const extensions = inputTld
        ? [inputTld, ...DEFAULT_EXTENSIONS.filter((e) => e !== inputTld)]
        : DEFAULT_EXTENSIONS

      const checks = await Promise.all(
        extensions.map(async (tld): Promise<DomainSearchResult> => {
          const fullDomain = `${sld}.${tld}`
          try {
            const res = await fetch(
              `https://dns.google/resolve?name=${encodeURIComponent(fullDomain)}&type=A`,
            )
            if (!res.ok) return { domain: fullDomain, available: false, premium: false }
            const data = await res.json()
            const taken = Array.isArray(data.Answer) && data.Answer.length > 0
            return { domain: fullDomain, available: !taken, premium: false }
          } catch {
            return { domain: fullDomain, available: false, premium: false }
          }
        }),
      )

      setResults(checks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Domain search failed')
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, searchDomain }
}
