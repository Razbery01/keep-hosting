import { describe, it, expect, afterEach, vi } from 'vitest'

describe('Supabase client requires env vars', () => {
  const originalUrl = import.meta.env.VITE_SUPABASE_URL
  const originalKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  afterEach(() => {
    // restore
    import.meta.env.VITE_SUPABASE_URL = originalUrl
    import.meta.env.VITE_SUPABASE_ANON_KEY = originalKey
    vi.resetModules()
  })

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    import.meta.env.VITE_SUPABASE_URL = ''
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
    await expect(import('../supabase')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    import.meta.env.VITE_SUPABASE_ANON_KEY = ''
    await expect(import('../supabase')).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('constructs a client when both env vars are set', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
    const mod = await import('../supabase')
    expect(mod.supabase).toBeDefined()
  })
})
