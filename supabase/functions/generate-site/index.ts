import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { sanitizeForPrompt } from '../_shared/sanitize.ts'
import { scanGeneratedHtml, scanForMobileWarnings } from '../_shared/html-scanner.ts'
import { buildCodeAgentPrompt } from '../_shared/prompts.ts'
import { calcCostUsd, usdToZar, type ClaudeUsage } from '../_shared/cost-calc.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

// ─────────────────────────────────────────────
// Per-package Claude output token caps (GEN-03 / 02-CONTEXT.md)
// Starter: single-page site; Professional: 4 pages; Enterprise: 6+ pages
// ─────────────────────────────────────────────
const PACKAGE_MAX_TOKENS: Record<string, number> = {
  starter:      12000,
  professional: 24000,
  enterprise:   48000,
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface SiteImage {
  url: string
  alt: string
  placement: string
}

interface GenerationCostAttempt {
  attempt: number
  started_at: string
  image_agent: { input_tokens: number; output_tokens: number; cache_read_tokens: number }
  code_agent:  { input_tokens: number; output_tokens: number; cache_read_tokens: number }
  total_input_tokens: number
  total_output_tokens: number
  total_usd: number
  total_zar: number
  status: 'success' | 'failed'
}

interface GenerationCostRecord {
  attempts: GenerationCostAttempt[]
  lifetime_total_usd: number
  lifetime_total_zar: number
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

async function logEvent(
  supabase: any,
  siteId: string,
  eventType: string,
  status: string,
  message: string,
) {
  await supabase.from('build_events').insert({ site_id: siteId, event_type: eventType, status, message })
}

// ─────────────────────────────────────────────
// Retry ladder (GEN-03 / 02-CONTEXT.md)
// Retries: 429, 529, 5xx — up to maxRetries=2 (3 attempts total)
// Never retries: 400, 401, 403 — fails loudly
// Backoff: 2s, 8s with ±25% jitter
// ─────────────────────────────────────────────

async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  siteId: string,
  supabase: any,
  maxRetries = 2,
): Promise<T> {
  let attempt = 0
  const baseDelayMs = 2000  // 2s base → 2s, 8s with 4x exponential
  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode ?? 0
      const isRetryable = status === 429 || status === 529 || status >= 500
      if (!isRetryable || attempt >= maxRetries) {
        throw err  // 400/401/403 → fail loudly; exhausted retries → throw
      }
      attempt++
      const delay = baseDelayMs * Math.pow(4, attempt - 1)  // 2s, 8s
      const jitter = delay * (0.75 + Math.random() * 0.5)  // ±25%
      await logEvent(
        supabase,
        siteId,
        'retry_scheduled',
        'info',
        `Attempt ${attempt + 1}/${maxRetries + 1} after ${Math.round(jitter)}ms (status ${status})`,
      )
      await new Promise(r => setTimeout(r, jitter))
    }
  }
  throw new Error('Max retries exhausted')
}

// ─────────────────────────────────────────────
// Curated fallback images (copied from build-site/index.ts for Pexels fallback path)
// ─────────────────────────────────────────────

function getCuratedImages(industry: string): SiteImage[] {
  const curated: Record<string, SiteImage[]> = {
    'Restaurant / Food': [
      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Beautifully plated gourmet dish', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80', alt: 'Elegant restaurant interior with warm lighting', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80', alt: 'Chef preparing food in professional kitchen', placement: 'service-1' },
      { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80', alt: 'Fresh ingredients and produce', placement: 'service-2' },
    ],
    'Professional Services': [
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', alt: 'Modern professional office space', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80', alt: 'Business professionals collaborating', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80', alt: 'Professional consulting meeting', placement: 'service-1' },
    ],
    'Healthcare': [
      { url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80', alt: 'Modern medical facility', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', alt: 'Healthcare professional with patient', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80', alt: 'Medical equipment and technology', placement: 'service-1' },
    ],
    'Construction': [
      { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80', alt: 'Construction site with modern building', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80', alt: 'Construction team at work', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80', alt: 'Architectural blueprints and planning', placement: 'service-1' },
    ],
    'Beauty / Wellness': [
      { url: 'https://images.unsplash.com/photo-1560750588-73b555e41656?auto=format&fit=crop&w=1200&q=80', alt: 'Elegant beauty salon interior', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', alt: 'Professional beauty treatment', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=600&q=80', alt: 'Skincare and beauty products', placement: 'service-1' },
    ],
    'Real Estate': [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', alt: 'Beautiful modern home exterior', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', alt: 'Luxury home interior design', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80', alt: 'Real estate agent with keys', placement: 'service-1' },
    ],
    'Retail / E-commerce': [
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', alt: 'Stylish retail store interior', placement: 'hero' },
      { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80', alt: 'Shopping experience', placement: 'about' },
      { url: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80', alt: 'Product display and packaging', placement: 'service-1' },
    ],
  }

  const fallback: SiteImage[] = [
    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', alt: 'Professional workspace', placement: 'hero' },
    { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', alt: 'Team collaboration', placement: 'about' },
    { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=600&q=80', alt: 'Professional at work', placement: 'service-1' },
  ]

  return curated[industry] || fallback
}

// ─────────────────────────────────────────────
// Agent 1: Image Agent — sources real photography via Pexels
// Uses tool_choice: { type: 'tool', name: 'deliver_search_queries' }
// Falls back to getCuratedImages on any failure
// ─────────────────────────────────────────────

async function runImageAgent(
  site: any,
  heroUrl: string,
  supabase: any,
  siteId: string,
): Promise<{ images: SiteImage[]; usage: ClaudeUsage }> {
  const pexelsKey = Deno.env.get('PEXELS_API_KEY')
  const images: SiteImage[] = []

  if (heroUrl) {
    images.push({ url: heroUrl, alt: `${site.business_name} hero image`, placement: 'hero' })
  }

  if (!pexelsKey) {
    await logEvent(supabase, siteId, 'image_agent', 'info', 'No PEXELS_API_KEY — using curated fallback images')
    return {
      images: [...images, ...getCuratedImages(site.industry)],
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  await logEvent(supabase, siteId, 'image_agent', 'info', 'Image Agent: generating search queries...')

  const imageAgentPrompt = `You are an image researcher for a website project. Generate 6 short, specific Pexels search queries to find professional photos for this business website.

Business: ${site.business_name}
Industry: ${site.industry}
Description: ${site.description || 'N/A'}
Services: ${site.services_text || 'N/A'}

${heroUrl ? 'Skip the hero — one is already provided. Generate 5 queries for other sections.' : 'Include a hero image query.'}`

  let queries: { query: string; placement: string; alt: string }[] = []
  let imageUsage: ClaudeUsage = { input_tokens: 0, output_tokens: 0 }

  try {
    const imageStream = await callClaudeWithRetry(
      () => anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        // DO NOT pass `thinking` — API 400 if combined with forced tool_choice
        tools: [{
          name: 'deliver_search_queries',
          description: 'Deliver Pexels image search queries for the website',
          input_schema: {
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query:     { type: 'string', description: 'Pexels search term, 2-4 words' },
                    placement: { type: 'string', description: 'Where image goes on page (hero, about, service-1, etc.)' },
                    alt:       { type: 'string', description: 'Descriptive alt text' },
                  },
                  required: ['query', 'placement', 'alt'],
                },
              },
            },
            required: ['queries'],
          },
        }],
        tool_choice: { type: 'tool', name: 'deliver_search_queries' },
        messages: [{ role: 'user', content: imageAgentPrompt }],
      }),
      siteId,
      supabase,
    )

    const imageResponse = await imageStream.finalMessage()
    imageUsage = imageResponse.usage

    const toolBlock = imageResponse.content.find((b: any) => b.type === 'tool_use')
    if (toolBlock && toolBlock.type === 'tool_use') {
      queries = (toolBlock.input as { queries: typeof queries }).queries
    }
  } catch {
    await logEvent(supabase, siteId, 'image_agent', 'info', 'Image Agent Claude call failed — using curated fallback')
    return {
      images: [...images, ...getCuratedImages(site.industry)],
      usage: imageUsage,
    }
  }

  if (queries.length === 0) {
    await logEvent(supabase, siteId, 'image_agent', 'info', 'Query generation returned empty — using curated fallback')
    return { images: [...images, ...getCuratedImages(site.industry)], usage: imageUsage }
  }

  await logEvent(supabase, siteId, 'image_agent', 'info', `Image Agent: fetching ${queries.length} images from Pexels...`)

  // Fetch images from Pexels API in parallel
  const fetched = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q.query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: pexelsKey } },
        )
        if (!res.ok) return null
        const data = await res.json()
        const photo = data.photos?.[0]
        if (!photo) return null
        return {
          url: photo.src.large2x || photo.src.large || photo.src.original,
          alt: q.alt,
          placement: q.placement,
        } as SiteImage
      } catch {
        return null
      }
    }),
  )

  const validImages = fetched.filter((img): img is SiteImage => img !== null)
  await logEvent(supabase, siteId, 'image_agent', 'success', `Sourced ${validImages.length} images`)

  return { images: [...images, ...validImages], usage: imageUsage }
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const supabase = getSupabaseAdmin()

  try {
    const { siteId } = await req.json()
    if (!siteId) return jsonResponse({ error: 'siteId is required' }, 400)

    const { data: site, error: siteErr } = await supabase
      .from('client_sites')
      .select('*, orders(*)')
      .eq('id', siteId)
      .single()
    if (siteErr || !site) return jsonResponse({ error: 'Site not found' }, 404)

    const startedAt = new Date().toISOString()

    // Increment retry_count and record last_attempted_at for orchestrator visibility
    await supabase.from('client_sites').update({
      build_status: 'generating',
      last_attempted_at: startedAt,
    }).eq('id', siteId)

    await supabase.from('orders').update({ status: 'building' }).eq('id', site.order_id)
    await logEvent(supabase, siteId, 'build_start', 'info', 'generate-site pipeline started')

    // Fetch uploaded assets
    const { data: uploads } = await supabase.from('file_uploads').select('*').eq('site_id', siteId)
    const logoUpload = uploads?.find((u: any) => u.file_type === 'logo')
    const heroUpload = uploads?.find((u: any) => u.file_type === 'hero_image')

    let logoUrl = ''
    let heroUrl = ''
    if (logoUpload) {
      logoUrl = supabase.storage.from('client-assets').getPublicUrl(logoUpload.file_path).data.publicUrl
    }
    if (heroUpload) {
      heroUrl = supabase.storage.from('client-assets').getPublicUrl(heroUpload.file_path).data.publicUrl
    }

    const pkg = site.orders?.package || 'starter'
    const isMultiPage = pkg === 'professional' || pkg === 'enterprise'

    // ── AGENT 1: Image Agent ──
    await logEvent(supabase, siteId, 'image_agent_start', 'info', 'Image Agent: sourcing photography...')
    const { images: siteImages, usage: imageUsage } = await runImageAgent(site, heroUrl, supabase, siteId)
    await logEvent(supabase, siteId, 'image_agent_done', 'success', `Image Agent: ${siteImages.length} images ready`)

    const imageBlock = siteImages.length > 0
      ? `═══ IMAGES (USE ALL OF THESE) ═══\n${siteImages.map((img, i) => `${i + 1}. [${img.placement}] ${img.url}\n   Alt: ${img.alt}`).join('\n')}`
      : 'No images provided — use gradient backgrounds and CSS patterns instead.'

    // ── AGENT 2: Code Agent ──
    await logEvent(supabase, siteId, 'code_agent_start', 'info', 'Code Agent: generating website...')

    // Sanitize all user-supplied text fields before interpolating into the Claude prompt (SEC-06)
    const safe = {
      business_name: sanitizeForPrompt(site.business_name ?? '', 'business_name'),
      tagline: sanitizeForPrompt(site.tagline ?? '', 'tagline'),
      description: sanitizeForPrompt(site.description ?? '', 'description'),
      about_text: sanitizeForPrompt(site.about_text ?? '', 'about_text'),
      services_text: sanitizeForPrompt(site.services_text ?? '', 'services_text'),
      goals: sanitizeForPrompt(site.goals ?? '', 'goals'),
    }

    const socialEntries = Object.entries(site.social_links || {}).filter(([, v]) => v)
    const socialSummary = socialEntries.length > 0
      ? socialEntries.map(([k, v]) => `${k}: ${v}`).join('\n')
      : 'None provided'

    const userPrompt = `Build a ${isMultiPage ? 'multi-page' : 'single-page'} website for the following business.

═══ BUSINESS ═══
Name: ${safe.business_name}
Industry: ${site.industry}
Tagline: ${safe.tagline}
Description: ${safe.description}
Goals: ${safe.goals}

═══ CONTACT ═══
Email: ${site.contact_email}
Phone: ${site.contact_phone || 'Not provided'}
Address: ${site.contact_address || 'Not provided'}

═══ BRAND ═══
Primary Color: ${site.primary_color}
Secondary Color: ${site.secondary_color}
Font: ${site.font_preference}
${logoUrl ? `Logo: ${logoUrl}` : 'Logo: None — create a clean text-based wordmark using the business name in the brand font with the secondary color as an accent.'}

${imageBlock}

═══ CONTENT ═══
About: ${safe.about_text || safe.description || ''}
Services/Products: ${safe.services_text || ''}

If the about or services content above is empty or very brief, write compelling, realistic copy for a ${site.industry.toLowerCase()} business called "${safe.business_name}". Make it sound authentic and professional — not generic.

═══ SOCIAL ═══
${socialSummary}

═══ PACKAGE ═══
${pkg.toUpperCase()}
${pkg === 'starter' ? 'Build a single-page site with smooth-scroll sections: Hero (with provided hero image), About (with about image), Services (3-4 cards with service images), Contact form, Footer.' : ''}
${pkg === 'professional' ? 'Build 4 pages: Home (hero image + highlights + CTA), About (story + about image + values), Services (detailed cards with images), Contact (form + details). Consistent navigation with active state per page.' : ''}
${pkg === 'enterprise' ? 'Build a comprehensive multi-page site (6+ pages): Home, About, Services, Portfolio/Gallery (with all gallery images), FAQ/Testimonials, Contact. Advanced interactions, parallax effects, animated counters.' : ''}

Deliver all files via the deliver_site_files tool now.`

    // Per-package token cap (GEN-03)
    const maxOutputTokens = PACKAGE_MAX_TOKENS[pkg] ?? PACKAGE_MAX_TOKENS.starter

    // NOTE: Use non-streaming messages.create() instead of messages.stream() for the Code Agent.
    // Streaming + forced tool_choice on long max_tokens (12k+) intermittently leaves
    // toolBlock.input as {} after finalMessage() resolves — the SDK fails to merge
    // input_json_delta events for long streams. Diagnosed via build_events
    // (event_type='code_agent_input_shape') showing keys=, has_files=false. The Image Agent
    // (max_tokens=1024) keeps streaming because its input is small enough to accumulate cleanly.
    // Code Agent model: Haiku 4.5 on Free tier (50s wall clock can't fit Sonnet 4.6 generating 12k tokens of HTML/CSS).
    // Haiku 4.5 generates ~3-4x faster, fits within 50s. Promote to Sonnet 4.6 once on Supabase Pro (150s window).
    const codeResponse = await callClaudeWithRetry(
      () => anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxOutputTokens,
        // DO NOT pass `thinking` — API 400 if combined with forced tool_choice (02-RESEARCH.md Critical Finding)
        system: buildCodeAgentPrompt({ industry: site.industry }),
        tools: [{
          name: 'deliver_site_files',
          description: 'Deliver the generated website files as structured JSON. You MUST call this tool with all generated HTML files.',
          input_schema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path:    { type: 'string', description: 'File path relative to site root (e.g. index.html, pages/about.html, assets/style.css)' },
                    content: { type: 'string', description: 'Complete file content' },
                  },
                  required: ['path', 'content'],
                },
              },
            },
            required: ['files'],
          },
        }],
        tool_choice: { type: 'tool', name: 'deliver_site_files' },
        messages: [{ role: 'user', content: userPrompt }],
      }),
      siteId,
      supabase,
    )

    const codeUsage: ClaudeUsage = codeResponse.usage

    const toolBlock = codeResponse.content.find((b: any) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('No tool_use block in Code Agent response — unexpected with forced tool_choice')
    }

    // Diagnostic: log the shape of toolBlock.input so we can see what Claude actually returned.
    // Streaming + tool_use sometimes returns input as raw JSON string instead of parsed object
    // depending on SDK version and whether deltas were accumulated. Be defensive.
    const rawInput: any = toolBlock.input
    await logEvent(
      supabase,
      siteId,
      'code_agent_input_shape',
      'info',
      `tool_use input: type=${typeof rawInput}, keys=${rawInput && typeof rawInput === 'object' ? Object.keys(rawInput).join(',') : 'n/a'}, has_files=${!!rawInput?.files}, files_count=${Array.isArray(rawInput?.files) ? rawInput.files.length : 'not-array'}`,
    )

    // Tolerate the SDK returning input as a JSON string instead of a parsed object
    let parsedInput: any = rawInput
    if (typeof rawInput === 'string') {
      try { parsedInput = JSON.parse(rawInput) } catch { parsedInput = {} }
    }

    // Tolerate alternative field names the model might emit under schema validation slack
    const candidateArrays = [
      parsedInput?.files,
      parsedInput?.site_files,
      parsedInput?.pages,
      parsedInput?.output,
    ].filter(Array.isArray)
    const rawFiles: Array<{ path: string; content: string }> = candidateArrays[0] ?? []

    if (rawFiles.length === 0) {
      await logEvent(
        supabase,
        siteId,
        'code_agent_empty',
        'error',
        `tool_use returned no files. Full input: ${JSON.stringify(parsedInput).slice(0, 1000)}`,
      )
      throw new Error('Code Agent tool_use returned no files (input shape logged to build_events)')
    }

    const files = rawFiles.filter(f => {
      const p = f.path
      if (p.includes('..') || p.startsWith('/')) {
        console.warn(`Skipping invalid path: ${p}`)
        return false
      }
      // Allow: index.html, pages/*.html, assets/*.*
      return true
    })

    if (!files || files.length === 0) {
      throw new Error('No valid files in tool_use response')
    }

    // ── Cost tracking (GEN-07) — wrapped in try/catch so failures never break the build ──
    try {
      const { data: existingRow } = await supabase
        .from('client_sites')
        .select('generation_cost, retry_count')
        .eq('id', siteId)
        .single()

      const existing: GenerationCostRecord = (existingRow?.generation_cost as any) ?? {
        attempts: [],
        lifetime_total_usd: 0,
        lifetime_total_zar: 0,
      }

      const attemptNum = (existingRow?.retry_count ?? 0) + 1
      const imageUsd = calcCostUsd(imageUsage)
      const codeUsd  = calcCostUsd(codeUsage)
      const totalUsd = imageUsd + codeUsd
      const totalZar = usdToZar(totalUsd)

      existing.attempts.push({
        attempt: attemptNum,
        started_at: startedAt,
        image_agent: {
          input_tokens:      imageUsage.input_tokens,
          output_tokens:     imageUsage.output_tokens,
          cache_read_tokens: imageUsage.cache_read_input_tokens ?? 0,
        },
        code_agent: {
          input_tokens:      codeUsage.input_tokens,
          output_tokens:     codeUsage.output_tokens,
          cache_read_tokens: codeUsage.cache_read_input_tokens ?? 0,
        },
        total_input_tokens:  imageUsage.input_tokens + codeUsage.input_tokens,
        total_output_tokens: imageUsage.output_tokens + codeUsage.output_tokens,
        total_usd: totalUsd,
        total_zar: totalZar,
        status: 'success',
      })

      existing.lifetime_total_usd = (existing.lifetime_total_usd ?? 0) + totalUsd
      existing.lifetime_total_zar = usdToZar(existing.lifetime_total_usd)

      await supabase.from('client_sites')
        .update({ generation_cost: existing })
        .eq('id', siteId)
    } catch (costErr) {
      await logEvent(supabase, siteId, 'cost_tracking_error', 'warning', (costErr as Error).message)
      // Do NOT fail the build — cost tracking errors are non-fatal
    }

    // ── HTML scan: SEC-07 (hard) + GEN-04 mobile warnings (soft) ──
    for (const file of files) {
      if (file.path.endsWith('.html')) {
        const scanResult = scanGeneratedHtml(file.content)
        if (!scanResult.safe) {
          await logEvent(supabase, siteId, 'html_scan', 'error',
            `Generated HTML failed security/viewport scan: ${scanResult.violations.join(', ')}`)
          await supabase.from('client_sites')
            .update({ build_status: 'failed' })
            .eq('id', siteId)
          throw new Error('Generated HTML failed safety/viewport check: ' + scanResult.violations.join(', '))
        }
      }
    }

    // GEN-04 mobile warnings (soft — log only, does NOT fail the build)
    for (const file of files) {
      if (file.path.endsWith('.html')) {
        const warnings = scanForMobileWarnings(file.content)
        if (warnings.hardcoded_widths.length > 0) {
          await logEvent(supabase, siteId, 'mobile_warning', 'warning',
            warnings.hardcoded_widths.join('; '))
        }
      }
    }

    // ── Success: update status + fire-and-forget persist-files ──
    await supabase.from('client_sites').update({
      build_status: 'generated',
      build_log: `Generated ${files.length} file(s) with ${siteImages.length} images`,
    }).eq('id', siteId)

    await logEvent(supabase, siteId, 'code_agent_done', 'success', `Generated ${files.length} file(s)`)

    // Fire-and-forget: don't await — persist-files has its own 150s wall-clock budget
    supabase.functions.invoke('persist-files', { body: { siteId, files } })
      .catch(async (err: Error) => {
        await logEvent(supabase, siteId, 'persist_invoke_error', 'error', err.message)
      })

    return jsonResponse({ success: true, files_count: files.length, images_count: siteImages.length })
  } catch (err) {
    const errorMessage = (err as Error).message
    console.error('generate-site error:', errorMessage)

    try {
      const { siteId: sid } = await req.clone().json()
      if (sid) {
        const supabase2 = getSupabaseAdmin()
        await supabase2.from('client_sites').update({
          build_status: 'failed',
          build_log: errorMessage,
        }).eq('id', sid)
        await logEvent(supabase2, sid, 'build_error', 'error', errorMessage)
      }
    } catch { /* ignore clone errors */ }

    return jsonResponse({ error: errorMessage }, 500)
  }
})
