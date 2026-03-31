import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { PACKAGES } from '../lib/constants'

export default function PricingPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Pricing</h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              Transparent, once-off pricing. No hidden fees, no surprises. Pick the plan that fits.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PACKAGES.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-2xl p-8 border-2 ${
                  pkg.highlighted
                    ? 'border-accent bg-white shadow-2xl relative'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-sm font-bold px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{pkg.name}</h3>
                <p className="text-gray-500 mt-1 mb-6">{pkg.description}</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">R{pkg.price.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">once-off</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/signup?package=${pkg.id}`}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                    pkg.highlighted
                      ? 'bg-accent text-white hover:bg-accent-dark'
                      : 'bg-primary text-white hover:bg-primary-light'
                  }`}
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 bg-white rounded-2xl p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-semibold text-gray-900">Feature</th>
                    {PACKAGES.map((pkg) => (
                      <th key={pkg.id} className="text-center py-3 px-4 font-semibold text-gray-900">
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Pages', '1', 'Up to 8', 'Unlimited'],
                    ['Custom Design', 'Basic', 'Advanced', 'Premium'],
                    ['Hosting & SSL', 'Yes', 'Yes', 'Premium CDN'],
                    ['SEO Setup', 'Basic', 'Advanced', 'Full SEO/GEO/SEM'],
                    ['Blog', 'No', 'Yes', 'Yes'],
                    ['Google Workspace', 'No', 'Setup only', 'Setup & Management'],
                    ['E-commerce', 'No', 'No', 'Yes'],
                    ['Custom Integrations', 'No', 'No', 'Yes'],
                    ['Revisions', '3', '5', 'Unlimited'],
                    ['Support', 'Email', 'Email & Chat', 'Dedicated Manager'],
                  ].map(([feature, ...values]) => (
                    <tr key={feature} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-600">{feature}</td>
                      {values.map((v, i) => (
                        <td key={i} className="text-center py-3 px-4 text-gray-700">
                          {v === 'Yes' ? (
                            <CheckCircle2 className="w-5 h-5 text-accent mx-auto" />
                          ) : v === 'No' ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            v
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
