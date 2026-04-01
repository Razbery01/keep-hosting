import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Globe, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
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
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <Globe className="w-14 h-14 text-accent mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Perfect Domain</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
              Search for available domains and secure your online identity. We'll handle registration and DNS setup for you.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your domain name (e.g., mybusiness.co.za)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 bg-white text-base focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-accent text-white px-8 py-4 rounded-xl font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
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
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Search Results</h2>
              {results.map((r) => (
                <motion.div
                  key={r.domain}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-5 rounded-xl border-2 bg-white ${
                    r.available ? 'border-green-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {r.available ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <span className="font-semibold text-gray-900">{r.domain}</span>
                      {r.premium && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          Premium
                        </span>
                      )}
                      <div className="text-sm text-gray-500">
                        {r.available ? 'Available' : 'Taken'}
                      </div>
                    </div>
                  </div>
                  {r.available && (
                    <button
                      type="button"
                      onClick={() => navigate(`/onboarding?domain=${encodeURIComponent(r.domain)}`)}
                      className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent-dark transition-colors"
                    >
                      Get Started <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center text-gray-400 py-16">
              <Globe className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Enter a domain name above to check availability</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Popular Extensions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['.co.za', '.org.za', '.web.za', '.com', '.net', '.org', '.africa', '.capetown'].map(
              (ext) => (
                <div
                  key={ext}
                  className="text-center py-4 rounded-xl border border-gray-200 hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
                >
                  <span className="text-lg font-bold text-gray-900">{ext}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </>
  )
}
