import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, Shield, Globe, Palette, Server, Search, Target,
  ClipboardCheck, Mail, Code, CheckCircle2, Sparkles, MousePointer2,
  Monitor, Star, ChevronRight, Play
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
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-dark">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,212,255,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,212,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <motion.div animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          <motion.div animate={{ y: [15, -15, 15], x: [10, -10, 10] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-0 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 bg-accent/10 backdrop-blur-sm border border-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> AI-Powered Web Design
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight drop-shadow-lg">
                <span className="text-white">Build Your</span><br />
                <span className="text-accent drop-shadow-[0_0_30px_rgba(0,212,255,0.3)]">Dream Website</span><br />
                <span className="text-white/80 text-4xl md:text-5xl font-bold">in Minutes</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-lg leading-relaxed">
                Choose a package. Tell us about your business. Our AI builds you a stunning, professional website — deployed and live instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/pricing" className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:scale-105 transition-all duration-300">
                  Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/services" className="group inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 border border-white/10">
                  <Play className="w-5 h-5" /> See How It Works
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-10 text-sm text-gray-400">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> No coding needed</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Live in minutes</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> From R999</div>
              </div>
            </motion.div>

            {/* Browser mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="hidden lg:block">
              <div className="relative">
                <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-accent/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white/5 rounded-lg px-4 py-1.5 text-xs text-gray-400 flex items-center gap-2">
                        <Globe className="w-3 h-3" /> yourbusiness.co.za
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="h-3 w-24 bg-accent/30 rounded-full" />
                    <div className="h-8 w-3/4 bg-white/10 rounded-lg" />
                    <div className="h-4 w-full bg-white/5 rounded" />
                    <div className="h-4 w-5/6 bg-white/5 rounded" />
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="h-20 bg-accent/10 rounded-xl border border-accent/20" />
                      <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                      <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <div className="h-10 w-32 bg-accent/30 rounded-lg" />
                      <div className="h-10 w-32 bg-white/5 rounded-lg" />
                    </div>
                  </div>
                </div>
                <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-6 -right-6 bg-accent/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-accent/30 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Built with AI
                </motion.div>
                <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-accent" /> Responsive
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <MousePointer2 className="w-5 h-5 text-gray-500" />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Websites Built' },
              { value: '99.9%', label: 'Uptime' },
              { value: '<24h', label: 'Delivery Time' },
              { value: '4.9/5', label: 'Client Rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Simple Process</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Live in 4 Easy Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">From sign-up to going live — no technical knowledge required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {[
              { step: '01', title: 'Choose a Package', desc: 'Pick the plan that fits your needs and budget.', icon: <Sparkles className="w-6 h-6" />, color: 'from-accent/20 to-accent/5' },
              { step: '02', title: 'Tell Us About You', desc: 'Fill in your business details, upload your logo and brand assets.', icon: <Palette className="w-6 h-6" />, color: 'from-blue-500/20 to-blue-500/5' },
              { step: '03', title: 'AI Builds Your Site', desc: 'Claude AI generates a professional, custom website for you.', icon: <Zap className="w-6 h-6" />, color: 'from-purple-500/20 to-purple-500/5' },
              { step: '04', title: 'Go Live!', desc: 'Your site is deployed, domain connected, and ready for visitors.', icon: <Globe className="w-6 h-6" />, color: 'from-green-500/20 to-green-500/5' },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative text-center px-6 py-8">
                {i < 3 && <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-200 to-gray-100" />}
                <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-accent mb-5 relative`}>
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-surface-dark relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Our Services</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Everything You Need Online</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">From design to SEO to hosting — one provider, zero hassle.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((service, i) => (
              <motion.div key={service.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl flex items-center justify-center text-accent mb-5 group-hover:from-accent group-hover:to-accent-dark group-hover:text-white group-hover:shadow-lg group-hover:shadow-accent/30 transition-all duration-300">
                  {iconMap[service.icon]}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
                <Link to="/services" className="inline-flex items-center gap-1 text-accent text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">No hidden fees. Pick a package, pay once, and your site is built and hosted.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PACKAGES.map((pkg, i) => (
              <motion.div key={pkg.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  pkg.highlighted
                    ? 'bg-gradient-to-b from-primary to-primary-dark text-white shadow-2xl shadow-primary/20 md:scale-105 z-10 border-2 border-accent/30'
                    : 'bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg'
                }`}>
                {pkg.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-lg shadow-accent/30 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-current" /> Most Popular
                    </span>
                  </div>
                )}
                <h3 className={`text-xl font-bold ${pkg.highlighted ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                <p className={`text-sm mt-1 mb-6 ${pkg.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{pkg.description}</p>
                <div className="mb-8">
                  <span className={`text-5xl font-extrabold tracking-tight ${pkg.highlighted ? 'text-white' : 'text-gray-900'}`}>R{pkg.price.toLocaleString()}</span>
                  <span className="text-sm ml-1 text-gray-400">once-off</span>
                </div>
                <ul className="space-y-3.5 mb-8">
                  {pkg.features.slice(0, 6).map((f) => (
                    <li key={f} className={`flex items-start gap-3 text-sm ${pkg.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={`/signup?package=${pkg.id}`}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    pkg.highlighted ? 'bg-accent text-white hover:shadow-lg hover:shadow-accent/30 hover:scale-105' : 'bg-primary text-white hover:bg-primary-light hover:shadow-lg'
                  }`}>
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-24 bg-gradient-to-b from-primary via-primary-dark to-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 border border-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Why Choose Us</span>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Why Keep Hosting?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">AI-powered development meets human expertise — exceptional results at marginal cost.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="w-7 h-7" />, title: 'Lightning Fast', desc: 'AI builds your site in minutes, not weeks. Go live faster than ever before.', stat: '<5 min', statLabel: 'Build time' },
              { icon: <Shield className="w-7 h-7" />, title: 'Reliable & Secure', desc: 'Free SSL, 99.9% uptime, and enterprise-grade hosting infrastructure.', stat: '99.9%', statLabel: 'Uptime' },
              { icon: <Globe className="w-7 h-7" />, title: 'Full Service', desc: 'Design, hosting, SEO, domains, email — everything under one roof.', stat: '8+', statLabel: 'Services' },
            ].map((item, i) => (
              <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
                <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mb-5 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed mb-6">{item.desc}</p>
                <div className="border-t border-white/10 pt-4">
                  <span className="text-2xl font-extrabold text-accent">{item.stat}</span>
                  <span className="text-sm text-gray-500 ml-2">{item.statLabel}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent via-cyan-500 to-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to Get Online?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join businesses across South Africa who trust Keep Hosting to build and manage their web presence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="group inline-flex items-center justify-center gap-2 bg-white text-primary px-10 py-4 rounded-xl font-extrabold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              Start Building <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20">
              Talk to Us
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
