import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Star } from 'lucide-react'
import { PACKAGES } from '../lib/constants'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
}

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-dark pt-32 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-accent" />
              <span className="text-accent text-sm font-semibold uppercase tracking-wider">Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              Transparent, once-off pricing. No hidden fees, no surprises. Pick the plan that fits.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {PACKAGES.map((pkg, i) => (
              <motion.div key={pkg.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  pkg.highlighted
                    ? 'bg-dark text-white shadow-2xl shadow-dark/30 md:scale-105 z-10 border border-white/10'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50'
                }`}>
                {pkg.highlighted && (
                  <>
                    <div className="absolute inset-0 rounded-3xl overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    </div>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-accent text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg shadow-accent/30 flex items-center gap-1.5 whitespace-nowrap">
                        <Star className="w-3.5 h-3.5 fill-current" /> Most Popular
                      </span>
                    </div>
                  </>
                )}
                <div className="relative">
                  <h3 className={`text-xl font-bold ${pkg.highlighted ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                  <p className={`text-sm mt-1 mb-6 ${pkg.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{pkg.description}</p>
                  <div className="mb-8">
                    <span className={`text-5xl font-extrabold tracking-tight ${pkg.highlighted ? 'text-white' : 'text-gray-900'}`}>R{pkg.price.toLocaleString()}</span>
                    <span className={`text-sm ml-2 ${pkg.highlighted ? 'text-gray-500' : 'text-gray-400'}`}>once-off</span>
                  </div>
                  <ul className="space-y-3.5 mb-8">
                    {pkg.features.map((f) => (
                      <li key={f} className={`flex items-start gap-3 text-sm ${pkg.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${pkg.highlighted ? 'text-accent' : 'text-accent/70'}`} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/signup?package=${pkg.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 ${
                      pkg.highlighted
                        ? 'bg-accent text-white hover:brightness-110'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-20 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Feature Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-4 px-8 font-semibold text-gray-500 text-xs uppercase tracking-wider">Feature</th>
                    {PACKAGES.map((pkg) => (
                      <th key={pkg.id} className={`text-center py-4 px-6 font-semibold text-xs uppercase tracking-wider ${pkg.highlighted ? 'text-accent' : 'text-gray-500'}`}>
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
                    <tr key={feature} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-8 text-gray-700 font-medium">{feature}</td>
                      {values.map((v, i) => (
                        <td key={i} className="text-center py-4 px-6 text-gray-600">
                          {v === 'Yes' ? (
                            <CheckCircle2 className="w-5 h-5 text-accent mx-auto" />
                          ) : v === 'No' ? (
                            <span className="text-gray-300">&mdash;</span>
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
          </motion.div>
        </div>
      </section>
    </>
  )
}
