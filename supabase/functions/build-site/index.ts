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
    const systemPrompt = `You are an expert web developer. You generate complete, production-ready websites based on client business details.

RULES:
- Output ONLY valid HTML, CSS, and JavaScript code
- Use modern, responsive design with CSS Grid and Flexbox
- Include smooth scroll, hover effects, and subtle animations
- Make the site mobile-first and fully responsive
- Use the client's brand colors and font throughout
- Include proper meta tags for SEO
- Use Font Awesome for icons (CDN link included)
- Use Google Fonts for the specified font
- All code must be in a single HTML file with embedded CSS and JS
- The design should be professional, modern, and visually impressive
- Include a contact form (frontend only)
- Include social media links if provided

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html>..." },
    { "path": "about.html", "content": "..." },
    ...
  ]
}

For starter package: Generate only index.html (single page with sections)
For professional package: Generate index.html, about.html, services.html, contact.html with shared navigation
For enterprise package: Generate a full multi-page site with advanced features`

    const userPrompt = `Generate a ${isMultiPage ? 'multi-page' : 'single-page'} website for:

BUSINESS DETAILS:
- Business Name: ${site.business_name}
- Industry: ${site.industry}
- Tagline: ${site.tagline || 'Professional ' + site.industry + ' Services'}
- Description: ${site.description || 'A trusted ' + site.industry.toLowerCase() + ' business.'}
- Goals: ${site.goals || 'Attract new customers and establish online presence'}

CONTACT INFO:
- Email: ${site.contact_email}
- Phone: ${site.contact_phone || ''}
- Address: ${site.contact_address || ''}

BRAND:
- Primary Color: ${site.primary_color}
- Secondary Color: ${site.secondary_color}
- Font: ${site.font_preference}
${logoUrl ? `- Logo URL: ${logoUrl}` : '- No logo provided, use a text-based logo with the business name'}
${heroUrl ? `- Hero Image URL: ${heroUrl}` : '- Use a gradient or pattern background for the hero section'}

CONTENT:
- About: ${site.about_text || site.description || 'We are a professional ' + site.industry.toLowerCase() + ' business committed to excellence.'}
- Services: ${site.services_text || 'We offer a range of professional services tailored to your needs.'}

SOCIAL MEDIA:
${JSON.stringify(site.social_links || {}, null, 2)}

PACKAGE: ${pkg}
${isMultiPage ? 'Generate multiple pages: Home, About, Services, Contact with consistent navigation.' : 'Generate a single-page website with sections for Home, About, Services, and Contact.'}

Return the JSON object with the files array.`

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
      message: `Deploy website for ${site.business_name} - Built by Keep Hosting with Claude AI`,
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
