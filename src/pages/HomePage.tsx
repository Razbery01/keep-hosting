import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, Shield, Globe, Palette, Server, Search, Target,
  ClipboardCheck, Mail, Code, CheckCircle2
} from 'lucide-react'
import { SERVICES, PACKAGES } from '../lib/constants'

const iconMap: Record<string, React.ReactNode> = {
  Palette: <Palette className="w-6 h-6" />,
  Server: <Server className="w-6 h-6" />,
  Search: <Search className="w-6 h-6" />,
  Globe: <Globe className="w-6 h-6" />,
  Target: <Target className="w-6 h-6" />,
  ClipboardCheck: <ClipboardCheck className="w-6 h-6" />,
  Mail: <Mail className="w-6 h-6" />,
  Code: <Code className="w-6 h-6" />,
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,212,255,0.15),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-block bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium mb-6">
              Web Design & Hosting Made Simple
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Your Business Online
              <span className="text-accent"> in Days,</span>
              <br />Not Months
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
              Professional websites built with AI, hosted reliably, and optimized for growth
              — all at a fraction of the cost. Choose a package, tell us about your business,
              and we handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-dark transition-colors"
              >
                View Packages <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/domains"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
              >
                Search Domains <Globe className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              From sign-up to going live — it's that simple.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Choose a Package', desc: 'Pick the plan that fits your needs and budget.' },
              { step: '02', title: 'Tell Us About You', desc: 'Fill in your business details, upload your logo and brand.' },
              { step: '03', title: 'AI Builds Your Site', desc: 'Our AI generates a professional, custom website for you.' },
              { step: '04', title: 'Go Live', desc: 'Your site is deployed, domain connected, and ready for visitors.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="text-5xl font-bold text-accent/20 mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need Online
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              From design to SEO to hosting — one provider, zero hassle.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:border-accent/30 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                  {iconMap[service.icon]}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-sm text-gray-500">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              No hidden fees. Pick a package, pay once, and your site is built and hosted.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PACKAGES.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`rounded-2xl p-8 border-2 ${
                  pkg.highlighted
                    ? 'border-accent bg-gradient-to-b from-accent/5 to-transparent shadow-xl scale-105'
                    : 'border-gray-100 bg-white'
                }`}
              >
                {pkg.highlighted && (
                  <span className="inline-block bg-accent text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{pkg.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">R{pkg.price.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm"> once-off</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {pkg.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
                    pkg.highlighted
                      ? 'bg-accent text-white hover:bg-accent-dark'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Keep Hosting?</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              We combine AI-powered development with human expertise to deliver exceptional results at marginal cost.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="w-6 h-6" />, title: 'Lightning Fast', desc: 'AI builds your site in minutes, not weeks. Go live faster than ever.' },
              { icon: <Shield className="w-6 h-6" />, title: 'Reliable & Secure', desc: 'Free SSL, 99.9% uptime, and enterprise-grade hosting infrastructure.' },
              { icon: <Globe className="w-6 h-6" />, title: 'Full Service', desc: 'Design, hosting, SEO, domains, email — everything under one roof.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center text-accent mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-accent to-accent-dark text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Online?</h2>
          <p className="text-lg text-white/80 mb-8">
            Choose a package, tell us about your business, and let AI build your dream website.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            Start Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
