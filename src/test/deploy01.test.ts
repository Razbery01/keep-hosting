import { describe, it } from 'vitest'

describe('DEPLOY-01 — no GitHub, direct zip-deploy to Netlify', () => {
  it.todo('deploy-site source does not import or reference github')
  it.todo('deploy-site source calls Netlify /sites/{id}/deploys endpoint')
  it.todo('persist-files source invokes deploy-site after Storage write')
  it.todo('build-site shim does not reference GITHUB_PAT')
})
