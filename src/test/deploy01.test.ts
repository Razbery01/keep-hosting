import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('DEPLOY-01 — no GitHub, direct zip-deploy to Netlify', () => {
  const deploySiteSource = fs.readFileSync('supabase/functions/deploy-site/index.ts', 'utf8')
  const persistFilesSource = fs.readFileSync('supabase/functions/persist-files/index.ts', 'utf8')
  const buildSiteSource = fs.readFileSync('supabase/functions/build-site/index.ts', 'utf8')

  it('deploy-site source does not import or reference github', () => {
    expect(deploySiteSource.toLowerCase()).not.toMatch(/github/)
  })

  it('deploy-site source declares Netlify API base URL with api.netlify.com', () => {
    expect(deploySiteSource).toMatch(/api\.netlify\.com/)
  })

  it('deploy-site source calls /sites/{id}/deploys endpoint', () => {
    expect(deploySiteSource).toMatch(/\/sites\/.*\/deploys|sites.*deploys/)
  })

  it('persist-files source invokes deploy-site after Storage write', () => {
    expect(persistFilesSource).toMatch(/invoke.*deploy-site/)
  })

  it('build-site shim does not reference GITHUB_PAT', () => {
    expect(buildSiteSource).not.toMatch(/GITHUB_PAT/)
  })
})
