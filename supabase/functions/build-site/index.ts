import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { sanitizeForPrompt } from '../_shared/sanitize.ts'
import { scanGeneratedHtml } from '../_shared/html-scanner.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
})

// ─────────────────────────────────────────────
// Agent 1: Image Agent — sources real photography
// ─────────────────────────────────────────────

interface SiteImage {
  url: string
  alt: string
  placement: string
}

async function runImageAgent(
  site: any,
  heroUrl: string,
  supabase: any,
  siteId: string,
): Promise<SiteImage[]> {
  const pexelsKey = Deno.env.get('PEXELS_API_KEY')
  const images: SiteImage[] = []

  if (heroUrl) {
    images.push({ url: heroUrl, alt: `${site.business_name} hero image`, placement: 'hero' })
  }

  if (!pexelsKey) {
    await logEvent(supabase, siteId, 'image_agent', 'info', 'No PEXELS_API_KEY — using curated fallback images')
    return [...images, ...getCuratedImages(site.industry)]
  }

  await logEvent(supabase, siteId, 'image_agent', 'info', 'Image Agent: generating search queries...')

  // Ask Claude to generate targeted image search queries
  const queryResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an image researcher for a website project. Generate 6 short, specific Pexels search queries to find professional photos for this business website.

Business: ${site.business_name}
Industry: ${site.industry}
Description: ${site.description || 'N/A'}
Services: ${site.services_text || 'N/A'}

Return ONLY a JSON array of objects, each with:
- "query": the Pexels search term (2-4 words, specific and visual)
- "placement": where it goes ("hero", "about", "service-1", "service-2", "service-3", "gallery", "team", "cta-background")
- "alt": descriptive alt text for the image

${heroUrl ? 'Skip the hero — one is already provided. Generate 5 queries for other sections.' : 'Include a hero image query.'}

Example: [{"query": "chef cooking restaurant", "placement": "hero", "alt": "Professional chef preparing gourmet dishes"}]
Return ONLY the JSON array, no markdown.`,
    }],
  })

  let queries: { query: string; placement: string; alt: string }[] = []
  const textBlock = queryResponse.content.find((b: any) => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    try {
      const match = textBlock.text.match(/\[[\s\S]*\]/)
      if (match) queries = JSON.parse(match[0])
    } catch { /* use fallback */ }
  }

  if (queries.length === 0) {
    await logEvent(supabase, siteId, 'image_agent', 'info', 'Query generation failed — using curated fallback')
    return [...images, ...getCuratedImages(site.industry)]
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

  return [...images, ...validImages]
}

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
// Agent 2: Code Agent — builds the website
// ─────────────────────────────────────────────

const CODE_AGENT_SYSTEM = `You are a world-class web designer and front-end developer who builds websites that rival those from top agencies. Every site you create looks like it cost R50,000+ to build. You have deep expertise in visual design, typography, layout, color theory, motion design, and conversion-focused UX.

DESIGN PHILOSOPHY:
- Design like an award-winning agency. Every pixel matters.
- Create visual hierarchy through size contrast, weight, color, and spacing — not just bold text.
- Use generous whitespace. Let the design breathe. Cramped layouts look cheap.
- Follow the 60-30-10 color rule: 60% neutral/white, 30% primary brand color, 10% secondary/accent for CTAs and highlights.
- Typography sets the tone. Use a clear scale: hero headings 3-5rem, section headings 2-2.5rem, body 1-1.125rem, small text 0.875rem.
- Line height: headings 1.1-1.2, body text 1.6-1.8 for readability.
- Max content width ~1200px, max paragraph width ~65ch for comfortable reading.

LAYOUT & COMPONENTS:
- Hero section: Full-viewport or near-full, with a strong headline, a supporting sentence, and one clear CTA button. USE THE PROVIDED HERO IMAGE with a dark overlay for text readability.
- Navigation: Clean, sticky/fixed, with the business name/logo left-aligned and links right-aligned. Mobile: hamburger menu with smooth slide-in panel.
- Services/features: Use a card grid (2-3 columns) with provided images, short titles, and one-line descriptions. Cards should have subtle borders or shadows, and lift on hover.
- About section: Split layout — text on one side, provided about image on the other. Tell a compelling story.
- Testimonials: Generate 2-3 realistic testimonials with South African names and roles.
- Contact section: Clean form (Name, Email, Phone, Message) with a submit button. Show contact details (email, phone, address) alongside the form.
- Footer: Dark background (primary color or near-black), organized in 3-4 columns: brand + description, quick links, contact info, social icons. Copyright at bottom.
- CTA sections: Between content sections, add banner-style CTAs with compelling headlines.

IMAGE HANDLING (CRITICAL):
- You will receive a list of images with URLs, alt text, and placement hints.
- USE EVERY PROVIDED IMAGE in the website. Do not ignore them.
- Apply object-fit: cover to all images. Use proper aspect ratios (hero: 16:9, cards: 4:3, about: 3:4 or 1:1).
- Add a semi-transparent dark overlay on hero images for text readability: background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(IMAGE_URL).
- All images must have the provided descriptive alt text.
- Lazy-load below-the-fold images with loading="lazy".

VISUAL EFFECTS & MOTION:
- Smooth scroll behavior on all anchor links.
- Scroll-triggered fade-in-up animations on sections using IntersectionObserver (stagger children by 100ms). Keep animations subtle — 0.6s ease, 30px translateY.
- Hover states on ALL interactive elements: buttons scale 1.02-1.05 with shadow lift, cards translate-y -4px with shadow increase, links get color transitions.
- Buttons: Rounded corners (8-12px), generous padding (14px 32px), bold font weight, smooth color/shadow transitions.

TECHNICAL REQUIREMENTS:
- Valid HTML5, semantic elements (<header>, <main>, <section>, <footer>, <nav>, <article>).
- Mobile-first responsive design using CSS Grid and Flexbox. Breakpoints: 768px (tablet), 1024px (desktop).
- CSS custom properties for all brand colors and fonts at :root level.
- Load Google Fonts for the specified font family (weights 400, 500, 600, 700) with font-display: swap.
- Use Lucide icons via CDN (https://unpkg.com/lucide@latest) for a clean, modern icon set. Initialize with lucide.createIcons() at end of body.
- Meta tags: title, description, viewport, charset, Open Graph.
- All CSS embedded in <style> in the <head>. All JS embedded in <script> before </body>.
- Clean, indented, production-quality code. No placeholder "lorem ipsum" text.

COPYWRITING (THIS IS CRITICAL — COPY SELLS):
- NEVER use generic filler. Every word should feel hand-written for this specific business.
- When client content is sparse, write compelling, realistic copy appropriate to their industry and South African context.
- Headlines must be benefit-driven and emotionally compelling.
- About section should tell a STORY: who founded it, why, what drives the team.
- Generate 2-3 realistic testimonials with South African names, roles, and specific praise.
- CTAs should be action-oriented and varied across the page. Never repeat the same CTA text.
- Tone should match the industry: warm for food/wellness, authoritative for professional services, energetic for tech/construction.

SEO OPTIMIZATION:
- <title> tag: "[Business Name] — [Primary Service/Benefit] | [City/Region if available]". Max 60 characters.
- <meta name="description">: 150-160 character summary with primary keyword, location, and CTA.
- ONE <h1> per page. Use <h2> for section headings, <h3> for sub-headings.
- All images must have descriptive alt text (provided with each image).
- Add Open Graph tags: og:title, og:description, og:type, og:image.
- Use semantic HTML for all content.
- Generate a JSON-LD LocalBusiness structured data block in the <head>.

OUTPUT FORMAT:
Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html>..." }
  ]
}

For starter package: Single index.html with all sections as smooth-scroll sections.
For professional package: index.html, about.html, services.html, contact.html with consistent navigation and active nav state per page.
For enterprise package: Full multi-page site (6+ pages) with portfolio/gallery, FAQ/testimonials, and advanced interactive features.

CRITICAL: The JSON must be parseable. Escape all quotes inside HTML content strings. Do not wrap the JSON in markdown code fences.`

// ─────────────────────────────────────────────
// Orchestrator
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

    // Update status
    await supabase.from('client_sites').update({ build_status: 'generating' }).eq('id', siteId)
    await supabase.from('orders').update({ status: 'building' }).eq('id', site.order_id)
    await logEvent(supabase, siteId, 'build_start', 'info', 'Build pipeline started')

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
    const siteImages = await runImageAgent(site, heroUrl, supabase, siteId)
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

Return the JSON object now.`

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system: CODE_AGENT_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const response = await stream.finalMessage()

    const textBlock = response.content.find((b: any) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Code Agent')
    }

    let files: { path: string; content: string }[]
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*"files"[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      const parsed = JSON.parse(jsonMatch[0])
      files = parsed.files
    } catch {
      files = [{ path: 'index.html', content: textBlock.text }]
    }

    if (!files || files.length === 0) {
      throw new Error('No files generated')
    }

    // ── Scan generated HTML for unsafe content (SEC-07) ──
    for (const file of files) {
      if (file.path.endsWith('.html')) {
        const scanResult = scanGeneratedHtml(file.content)
        if (!scanResult.safe) {
          await logEvent(supabase, siteId, 'html_scan', 'error',
            `Generated HTML failed security scan: ${scanResult.violations.join(', ')}`)
          await supabase.from('client_sites')
            .update({ build_status: 'failed' })
            .eq('id', siteId)
          throw new Error('Generated HTML contains unsafe content: ' + scanResult.violations.join(', '))
        }
      }
    }

    await logEvent(supabase, siteId, 'code_agent_done', 'success', `Code Agent: ${files.length} file(s) generated`)

    await supabase.from('client_sites').update({
      build_status: 'generated',
      build_log: `Generated ${files.length} file(s) with ${siteImages.length} images`,
    }).eq('id', siteId)

    // ── Deploy to GitHub ──
    await logEvent(supabase, siteId, 'github_start', 'info', 'Pushing to GitHub...')
    const githubResult = await deployToGitHub(site, files)

    await supabase.from('client_sites').update({
      build_status: 'pushing_github',
      github_repo: githubResult.repo,
      github_url: githubResult.url,
    }).eq('id', siteId)

    await logEvent(supabase, siteId, 'github_done', 'success', `Pushed to ${githubResult.repo}`)

    // ── Deploy to Netlify ──
    await logEvent(supabase, siteId, 'netlify_start', 'info', 'Deploying to Netlify...')
    const netlifyResult = await deployToNetlify(githubResult.repo, site.business_name)

    await supabase.from('client_sites').update({
      build_status: 'live',
      netlify_site_id: netlifyResult.siteId,
      netlify_url: netlifyResult.url,
      live_url: netlifyResult.url,
    }).eq('id', siteId)

    await supabase.from('orders').update({ status: 'preview_ready' }).eq('id', site.order_id)
    await logEvent(supabase, siteId, 'deploy_done', 'success', `Live at ${netlifyResult.url}`)

    return jsonResponse({
      success: true,
      github_url: githubResult.url,
      netlify_url: netlifyResult.url,
      files_count: files.length,
      images_count: siteImages.length,
    })
  } catch (err) {
    const errorMessage = (err as Error).message
    console.error('Build error:', errorMessage)

    try {
      const { siteId } = await req.clone().json()
      if (siteId) {
        const supabase2 = getSupabaseAdmin()
        await supabase2.from('client_sites').update({ build_status: 'failed', build_log: errorMessage }).eq('id', siteId)
        await logEvent(supabase2, siteId, 'build_error', 'error', errorMessage)
      }
    } catch { /* ignore */ }

    return jsonResponse({ error: errorMessage }, 500)
  }
})

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

async function logEvent(supabase: any, siteId: string, eventType: string, status: string, message: string) {
  await supabase.from('build_events').insert({
    site_id: siteId,
    event_type: eventType,
    status,
    message,
  })
}

async function deployToGitHub(site: any, files: { path: string; content: string }[]) {
  const token = Deno.env.get('GITHUB_PAT')!
  const org = Deno.env.get('GITHUB_ORG') || 'Razbery01'
  const repoName = site.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const createRepoRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      name: repoName,
      description: `Website for ${site.business_name} - Built by Keep Hosting`,
      private: false,
      auto_init: true,
    }),
  })

  if (!createRepoRes.ok) {
    const err = await createRepoRes.json()
    if (!err.message?.includes('already exists')) {
      throw new Error(`GitHub repo creation failed: ${err.message}`)
    }
  }

  const owner = org
  const repo = repoName

  await new Promise(r => setTimeout(r, 2000))

  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  const refData = await refRes.json()
  const latestCommitSha = refData.object?.sha

  if (!latestCommitSha) {
    throw new Error('Could not get latest commit SHA')
  }

  const blobs = await Promise.all(
    files.map(async (file) => {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      })
      const blobData = await blobRes.json()
      return { path: file.path, sha: blobData.sha, mode: '100644' as const, type: 'blob' as const }
    }),
  )

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: latestCommitSha, tree: blobs }),
  })
  const treeData = await treeRes.json()

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Deploy website for ${site.business_name} - Built by Keep Hosting`,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  })
  const commitData = await commitRes.json()

  await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commitData.sha }),
  })

  return {
    repo: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
  }
}

async function deployToNetlify(githubRepo: string, siteName: string) {
  const token = Deno.env.get('NETLIFY_PAT')!
  const slug = siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `kh-${slug}`,
      repo: {
        provider: 'github',
        repo: githubRepo,
        branch: 'main',
        cmd: '',
        dir: '/',
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.json()
    throw new Error(`Netlify deploy failed: ${JSON.stringify(err)}`)
  }

  const siteData = await createRes.json()

  return {
    siteId: siteData.id,
    url: siteData.ssl_url || siteData.url || `https://${siteData.subdomain}.netlify.app`,
  }
}
