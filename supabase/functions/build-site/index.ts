import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
})

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const supabase = getSupabaseAdmin()

  try {
    const { siteId } = await req.json()
    if (!siteId) return jsonResponse({ error: 'siteId is required' }, 400)

    // Fetch site data
    const { data: site, error: siteErr } = await supabase
      .from('client_sites')
      .select('*, orders(*)')
      .eq('id', siteId)
      .single()
    if (siteErr || !site) return jsonResponse({ error: 'Site not found' }, 404)

    // Update status to generating
    await supabase.from('client_sites').update({ build_status: 'generating' }).eq('id', siteId)
    await supabase.from('orders').update({ status: 'building' }).eq('id', site.order_id)
    await logEvent(supabase, siteId, 'build_start', 'info', 'Website generation started')

    // Fetch uploaded files for logo URL
    const { data: uploads } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('site_id', siteId)

    const logoUpload = uploads?.find((u: any) => u.file_type === 'logo')
    const heroUpload = uploads?.find((u: any) => u.file_type === 'hero_image')

    // Get public URLs for uploaded assets
    let logoUrl = ''
    let heroUrl = ''
    if (logoUpload) {
      const { data: logoData } = supabase.storage.from('client-assets').getPublicUrl(logoUpload.file_path)
      logoUrl = logoData.publicUrl
    }
    if (heroUpload) {
      const { data: heroData } = supabase.storage.from('client-assets').getPublicUrl(heroUpload.file_path)
      heroUrl = heroData.publicUrl
    }

    // Determine site complexity based on package
    const pkg = site.orders?.package || 'starter'
    const isMultiPage = pkg === 'professional' || pkg === 'enterprise'

    // Build the prompt for Claude
    const systemPrompt = `You are a world-class web designer and front-end developer who builds websites that rival those from top agencies. Every site you create looks like it cost R50,000+ to build. You have deep expertise in visual design, typography, layout, color theory, motion design, and conversion-focused UX.

DESIGN PHILOSOPHY:
- Design like an award-winning agency. Every pixel matters.
- Create visual hierarchy through size contrast, weight, color, and spacing — not just bold text.
- Use generous whitespace. Let the design breathe. Cramped layouts look cheap.
- Follow the 60-30-10 color rule: 60% neutral/white, 30% primary brand color, 10% secondary/accent for CTAs and highlights.
- Typography sets the tone. Use a clear scale: hero headings 3-5rem, section headings 2-2.5rem, body 1-1.125rem, small text 0.875rem.
- Line height: headings 1.1-1.2, body text 1.6-1.8 for readability.
- Max content width ~1200px, max paragraph width ~65ch for comfortable reading.

LAYOUT & COMPONENTS:
- Hero section: Full-viewport or near-full, with a strong headline, a supporting sentence, and one clear CTA button. If no hero image, use a gradient using the brand colors with a subtle mesh, grain, or geometric pattern overlay — never a flat solid color.
- Navigation: Clean, sticky/fixed, with the business name/logo left-aligned and links right-aligned. Mobile: hamburger menu with smooth slide-in panel.
- Services/features: Use a card grid (2-3 columns) with icons, short titles, and one-line descriptions. Cards should have subtle borders or shadows, and lift on hover.
- About section: Split layout — text on one side, image or decorative element on the other. Tell a compelling story.
- Testimonials: If appropriate for the industry, generate 2-3 realistic testimonials with names and roles.
- Contact section: Clean form (Name, Email, Phone, Message) with a submit button. Show contact details (email, phone, address) alongside the form. Use the secondary color for the submit button.
- Footer: Dark background (primary color or near-black), organized in 3-4 columns: brand + description, quick links, contact info, social icons. Copyright at bottom.
- CTA sections: Between content sections, add banner-style CTAs with a compelling headline and button, using the secondary color as background.

VISUAL EFFECTS & MOTION:
- Smooth scroll behavior on all anchor links.
- Scroll-triggered fade-in-up animations on sections using IntersectionObserver (stagger children by 100ms). Keep animations subtle — 0.6s ease, 30px translateY.
- Hover states on ALL interactive elements: buttons scale 1.02-1.05 with shadow lift, cards translate-y -4px with shadow increase, links get color transitions.
- Buttons: Rounded corners (8-12px), generous padding (14px 32px), bold font weight, smooth color/shadow transitions.
- Add a subtle gradient or pattern to at least one section background to break visual monotony.

TECHNICAL REQUIREMENTS:
- Valid HTML5, semantic elements (<header>, <main>, <section>, <footer>, <nav>, <article>).
- Mobile-first responsive design using CSS Grid and Flexbox. Breakpoints: 768px (tablet), 1024px (desktop).
- CSS custom properties for all brand colors and fonts at :root level.
- Load Google Fonts for the specified font family (weights 400, 500, 600, 700).
- Use Lucide icons via CDN (https://unpkg.com/lucide@latest) for a clean, modern icon set. Initialize with lucide.createIcons() at end of body.
- Image handling: Use object-fit: cover on all images. Lazy-load below-the-fold images.
- Meta tags: title, description, viewport, charset, Open Graph (og:title, og:description, og:type).
- All CSS embedded in <style> in the <head>. All JS embedded in <script> before </body>.
- Clean, indented, production-quality code. No placeholder "lorem ipsum" text — write real, industry-appropriate copy.

COPYWRITING (THIS IS CRITICAL — COPY SELLS):
- NEVER use generic filler. Every word should feel hand-written for this specific business.
- When client content is sparse, research-grade copy is expected. Write as if you are a professional copywriter hired specifically for this brand.
- Headlines must be benefit-driven and emotionally compelling. "Your Dream Home Starts Here" not "Real Estate Services". "Meals Worth Coming Back For" not "Restaurant Menu".
- Opening paragraph should hook the reader in 1-2 sentences: address their pain point or aspiration, then position the business as the solution.
- Each service/product card should have: a compelling title, a one-sentence benefit statement, and optionally a bullet list of specifics.
- About section should tell a STORY: who founded it, why, what drives the team, and why customers trust them. Even if the client didn't provide this — infer and write something authentic to their industry and South African context.
- Generate 2-3 realistic testimonials with full names, roles/companies, and specific praise that references the business's actual services.
- CTAs should be action-oriented and varied across the page: "Get a Free Quote", "Book Your Consultation", "See Our Work", "Call Us Today", "Start Your Project". Never repeat the same CTA text twice.
- Write a compelling footer tagline/description (1-2 sentences about the business).
- Keep paragraphs to 2-3 sentences max. Use bullet points and short phrases for scannability.
- Tone should match the industry: warm and inviting for food/wellness, authoritative and trustworthy for professional services/healthcare, energetic for tech/construction.

SEO OPTIMIZATION (EVERY PAGE MUST BE SEARCH-ENGINE READY):
- <title> tag: "[Business Name] — [Primary Service/Benefit] | [City/Region if available]". Example: "ProFix Plumbing — Reliable Plumbing Services in Cape Town". Max 60 characters.
- <meta name="description">: Compelling 150-160 character summary with primary keyword, location, and CTA. Example: "Cape Town's trusted plumber for emergencies, installations & repairs. Fast response, fair pricing. Call for a free quote today."
- Use ONE <h1> per page — the main headline. Use <h2> for section headings, <h3> for sub-headings. Never skip heading levels.
- Include the business name and primary service keyword naturally in the first 100 words of page content.
- All images must have descriptive alt text: "Team of ProFix plumbers working on a residential installation" not "image1" or "photo".
- Add Open Graph tags: og:title, og:description, og:type (website), og:image (use hero or logo URL if available).
- Add canonical URL meta tag if domain is known.
- Use semantic HTML elements for all content: <article>, <section>, <aside>, <nav>, <header>, <footer>, <main>.
- Internal anchor links should use descriptive text: "View our services" not "Click here".
- Generate a JSON-LD structured data block (LocalBusiness schema) in the <head> with: business name, description, address, phone, email, and industry type.
- Ensure fast perceived load: critical CSS inline, defer non-essential JS, use font-display: swap on Google Fonts.

OUTPUT FORMAT:
Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html>..." }
  ]
}

For starter package: Single index.html with all sections (Home, About, Services, Contact) as scroll sections.
For professional package: index.html, about.html, services.html, contact.html — each a full page with consistent navigation, shared CSS via a <style> block duplicated in each file, and active nav state per page.
For enterprise package: Full multi-page site with additional pages as appropriate (portfolio/gallery, FAQ, team, etc.) and advanced interactive features.

CRITICAL: The JSON must be parseable. Escape all quotes inside HTML content strings. Do not wrap the JSON in markdown code fences.`

    const socialEntries = Object.entries(site.social_links || {}).filter(([, v]) => v)
    const socialSummary = socialEntries.length > 0
      ? socialEntries.map(([k, v]) => `${k}: ${v}`).join('\n')
      : 'None provided'

    const userPrompt = `Build a ${isMultiPage ? 'multi-page' : 'single-page'} website for the following business.

═══ BUSINESS ═══
Name: ${site.business_name}
Industry: ${site.industry}
Tagline: ${site.tagline || ''}
Description: ${site.description || ''}
Goals: ${site.goals || ''}

═══ CONTACT ═══
Email: ${site.contact_email}
Phone: ${site.contact_phone || 'Not provided'}
Address: ${site.contact_address || 'Not provided'}

═══ BRAND ═══
Primary Color: ${site.primary_color}
Secondary Color: ${site.secondary_color}
Font: ${site.font_preference}
${logoUrl ? `Logo: ${logoUrl}` : 'Logo: None — create a clean text-based wordmark using the business name in the brand font with the secondary color as an accent.'}
${heroUrl ? `Hero Image: ${heroUrl}` : 'Hero Image: None — design an eye-catching gradient hero using the primary and secondary colors with a subtle geometric pattern or mesh gradient overlay.'}

═══ CONTENT ═══
About: ${site.about_text || site.description || ''}
Services/Products: ${site.services_text || ''}

If the about or services content above is empty or very brief, write compelling, realistic copy for a ${site.industry.toLowerCase()} business called "${site.business_name}". Make it sound authentic and professional — not generic.

═══ SOCIAL ═══
${socialSummary}

═══ PACKAGE ═══
${pkg.toUpperCase()}
${pkg === 'starter' ? 'Build a single-page site with smooth-scroll sections: Hero, About, Services (3-4 cards), Contact form, Footer.' : ''}
${pkg === 'professional' ? 'Build 4 pages with consistent navigation: Home (hero + highlights + CTA), About (story + values/team), Services (detailed cards), Contact (form + map placeholder + details). Each page should feel complete and polished.' : ''}
${pkg === 'enterprise' ? 'Build a comprehensive multi-page site (6+ pages) with: Home, About, Services, Portfolio/Gallery, FAQ or Testimonials, Contact. Include advanced interactions, parallax effects, animated counters, and a premium feel throughout.' : ''}

Return the JSON object now.`

    await logEvent(supabase, siteId, 'claude_request', 'info', 'Sending request to Claude API')

    // Call Claude API to generate the website
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const response = await stream.finalMessage()

    // Extract the text response
    const textBlock = response.content.find((b: any) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse the JSON from Claude's response
    let files: { path: string; content: string }[]
    try {
      // Try to extract JSON from the response (Claude may wrap it in markdown)
      const jsonMatch = textBlock.text.match(/\{[\s\S]*"files"[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      const parsed = JSON.parse(jsonMatch[0])
      files = parsed.files
    } catch (parseErr) {
      // Fallback: treat entire response as a single HTML file
      files = [{ path: 'index.html', content: textBlock.text }]
    }

    if (!files || files.length === 0) {
      throw new Error('No files generated')
    }

    await logEvent(supabase, siteId, 'claude_response', 'success', `Generated ${files.length} file(s)`)

    // Update site status
    await supabase.from('client_sites').update({
      build_status: 'generated',
      build_log: `Generated ${files.length} file(s) using Claude API`,
    }).eq('id', siteId)

    // Now deploy to GitHub
    await logEvent(supabase, siteId, 'github_start', 'info', 'Pushing to GitHub...')

    const githubResult = await deployToGitHub(site, files)

    await supabase.from('client_sites').update({
      build_status: 'pushing_github',
      github_repo: githubResult.repo,
      github_url: githubResult.url,
    }).eq('id', siteId)

    await logEvent(supabase, siteId, 'github_done', 'success', `Pushed to ${githubResult.repo}`)

    // Deploy to Netlify
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
    })
  } catch (err) {
    const errorMessage = (err as Error).message
    console.error('Build error:', errorMessage)

    // Try to update status to failed
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

  // Create repository
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
    // If repo already exists, continue
    if (err.message?.includes('already exists')) {
      // repo exists, we'll push to it
    } else {
      throw new Error(`GitHub repo creation failed: ${err.message}`)
    }
  }

  const owner = org
  const repo = repoName

  // Wait for repo initialization
  await new Promise(r => setTimeout(r, 2000))

  // Get the default branch's latest commit SHA
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  const refData = await refRes.json()
  const latestCommitSha = refData.object?.sha

  if (!latestCommitSha) {
    throw new Error('Could not get latest commit SHA')
  }

  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      })
      const blobData = await blobRes.json()
      return { path: file.path, sha: blobData.sha, mode: '100644' as const, type: 'blob' as const }
    })
  )

  // Create tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: latestCommitSha, tree: blobs }),
  })
  const treeData = await treeRes.json()

  // Create commit
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

  // Update ref
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

  // Create Netlify site linked to GitHub repo
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
