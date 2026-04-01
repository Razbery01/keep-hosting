import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Globe, CheckCircle2, XCircle, Loader2, ArrowRight, Shield } from 'lucide-react'
import { useDomainSearch } from '../hooks/useDomainSearch'

export default function DomainSearchPage() {
  const [query, setQuery] = useState('')
  const { results, loading, error, searchDomain } = useDomainSearch()
  const navigate = useNavigate()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) searchDomain(query.trim())
  }

  return (
    <>
      <section className="relative overflow-hidden bg-dark pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-accent/50" />
              <Globe className="w-5 h-5 text-accent" />
              <div className="h-px w-12 bg-accent/50" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
              Find Your Perfect Domain
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Search for available domains and secure your online identity. We'll handle registration and DNS setup for you.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your domain name (e.g., mybusiness.co.za)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 bg-white text-base focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <button type="submit" disabled={loading}
                className="bg-accent text-white px-8 py-4 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-surface min-h-[40vh]">
        <div className="max-w-3xl mx-auto px-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Search Results</h2>
              {results.map((r) => (
                <motion.div key={r.domain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-5 rounded-2xl border bg-white transition-all hover:shadow-md ${
                    r.available ? 'border-green-200' : 'border-gray-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    {r.available ? (
                      <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{r.domain}</span>
                        {r.premium && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Premium</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1.5">
                        {r.available ? (
                          <><Shield className="w-3 h-3 text-green-500" /> Available</>
                        ) : 'Taken'}
                      </div>
                    </div>
                  </div>
                  {r.available && (
                    <button type="button" onClick={() => navigate(`/onboarding?domain=${encodeURIComponent(r.domain)}`)}
                      className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center text-gray-400 py-16">
              <Globe className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-gray-500">Enter a domain name above to check availability</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Popular Extensions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['.co.za', '.org.za', '.web.za', '.com', '.net', '.org', '.africa', '.capetown'].map((ext) => (
              <div key={ext} className="text-center py-4 rounded-xl bg-gray-50 border border-transparent hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group">
                <span className="text-lg font-bold text-gray-900 group-hover:text-accent transition-colors">{ext}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
