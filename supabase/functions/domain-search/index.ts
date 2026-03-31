import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { domain } = await req.json()
    if (!domain || typeof domain !== 'string') {
      return jsonResponse({ error: 'Domain is required' }, 400)
    }

    // Parse domain into SLD and TLD
    const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const parts = cleaned.split('.')
    const sld = parts[0]
    const tlds = parts.length > 1 ? [parts.slice(1).join('.')] : ['co.za']

    // Check multiple TLD variants
    const extensions = [...new Set([...tlds, 'co.za', 'org.za', 'web.za', 'com', 'net'])]

    const results = await Promise.all(
      extensions.map(async (tld) => {
        const fullDomain = `${sld}.${tld}`
        try {
          // DNS-based availability check (replace with ZADomains SOAP API for production)
          const response = await fetch(`https://dns.google/resolve?name=${fullDomain}&type=A`)
          const data = await response.json()
          const available = !data.Answer || data.Answer.length === 0
          return { domain: fullDomain, available, premium: false }
        } catch {
          return { domain: fullDomain, available: true, premium: false }
        }
      })
    )

    return jsonResponse({ results })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
