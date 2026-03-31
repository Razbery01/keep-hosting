import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DomainSearchResult } from '../types'

export function useDomainSearch() {
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function searchDomain(query: string) {
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const { data, error: fnError } = await supabase.functions.invoke('domain-search', {
        body: { domain: query },
      })

      if (fnError) throw fnError
      setResults(data?.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Domain search failed')
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, searchDomain }
}
