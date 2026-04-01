import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, Shield, Globe, Palette, Server, Search, Target,
  ClipboardCheck, Mail, Code, CheckCircle2, Sparkles,
  Monitor, Star, ChevronRight, ChevronDown,
  Utensils, ShoppingBag, Briefcase, Heart, HardHat, Scissors,
  Users, BadgeCheck, Clock, CreditCard, Eye, Rocket
} from 'lucide-react'
import { useState } from 'react'
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

const TESTIMONIALS = [
  { name: 'Thandi M.', role: 'Owner, Fresh Roots Catering', text: 'I had no website and no idea where to start. Keep Hosting built everything for me — I just filled in a form and got a stunning site within days. My bookings have doubled.', rating: 5 },
  { name: 'James P.', role: 'Founder, ProFix Plumbing', text: 'As a small business owner I can\'t afford agency prices. Keep Hosting gave me a professional website for a fraction of the cost. The preview-before-you-pay model sealed the deal.', rating: 5 },
  { name: 'Naledi K.', role: 'Director, Lumina Beauty Studio', text: 'The whole process took less than 10 minutes to submit. I got my preview the next day and it looked incredible. Hosting, SSL, domain — all sorted. Highly recommend.', rating: 5 },
]

const INDUSTRIES = [
  { icon: Utensils, label: 'Restaurants & Food' },
  { icon: ShoppingBag, label: 'Retail & E-commerce' },
  { icon: Briefcase, label: 'Professional Services' },
  { icon: Heart, label: 'Healthcare & Wellness' },
  { icon: HardHat, label: 'Construction & Trades' },
  { icon: Scissors, label: 'Beauty & Salons' },
]

const FAQS = [
  { q: 'Do I need any technical skills?', a: 'None at all. You fill in a simple form about your business, upload your logo if you have one, and we handle everything else — design, development, hosting, and deployment.' },
  { q: 'How long does it take?', a: 'Most websites are ready for preview within 24-48 hours of submitting your details. Once you approve and pay, it goes live immediately.' },
  { q: 'Do I have to pay upfront?', a: 'No. We build you a free preview first. You only pay once you\'ve seen your website and are happy with it. Zero risk.' },
  { q: 'What\'s included in the price?', a: 'Everything — professional website design, hosting, SSL certificate, SEO setup, and ongoing support. There are no hidden monthly fees for the first year of hosting.' },
  { q: 'Can I make changes after?', a: 'Absolutely. Each package includes revision rounds. You can request changes to text, images, colors, and layout until you\'re satisfied.' },
  { q: 'How is this different from GoDaddy or Afrihost?', a: 'Those providers give you hosting and a DIY builder — you still have to design and build the site yourself. We do everything for you. You get a professionally designed, custom website without lifting a finger.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-5 text-left group">
        <span className="text-base font-semibold text-gray-900 group-hover:text-accent transition-colors pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-accent' : ''}`} />
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
        <p className="text-gray-600 text-sm leading-relaxed pb-5">{a}</p>
      </motion.div>
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-dark">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,212,255,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,212,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-0 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 bg-accent/10 backdrop-blur-sm border border-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> Turnkey Websites for South African SMMEs
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight">
                <span className="text-white">Your Business</span><br />
                <span className="text-white">Deserves a</span><br />
                <span className="text-accent drop-shadow-[0_0_30px_rgba(0,212,255,0.3)]">Great Website</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg leading-relaxed">
                We build, host, and manage your entire web presence — so you can focus on running your business. No tech skills needed. Preview before you pay.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/onboarding" className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:scale-105 transition-all duration-300">
                  Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/pricing" className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 border border-white/10">
                  View Pricing
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-sm text-gray-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> No coding needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Preview before you pay</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> From R999 once-off</span>
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
                  <Zap className="w-4 h-4" /> Lightning Fast
                </motion.div>
                <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-accent" /> Fully Responsive
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Websites Delivered' },
              { value: '99.9%', label: 'Uptime Guaranteed' },
              { value: '<48h', label: 'Average Turnaround' },
              { value: 'R0', label: 'Upfront Cost' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes Us Different ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Why We're Different</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Not Another Hosting Company</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Other providers give you a control panel and say "good luck." We actually <strong className="text-gray-900">build your website for you</strong> — professionally designed, fully hosted, ready to go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-400 mb-4 text-sm uppercase tracking-wider">Traditional Hosting</h3>
              <ul className="space-y-3">
                {['Buy hosting separately', 'Learn a website builder', 'Design it yourself', 'Figure out DNS & SSL', 'Handle your own SEO', 'No support for design'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-accent/5 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">KEEP HOSTING</span>
              </div>
              <h3 className="font-bold text-accent mb-4 text-sm uppercase tracking-wider">Our Turnkey Solution</h3>
              <ul className="space-y-3">
                {['Tell us about your business', 'We design & build everything', 'Hosting & SSL included', 'Domain setup handled', 'SEO optimized from day one', 'Preview before you pay'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-800">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-20 bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Built for SMMEs</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">We Help Small Businesses Get Online</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              From bakeries to law firms, plumbers to beauty salons — if you're a South African SMME that needs a professional web presence without the agency price tag, we're for you.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }, i) => (
              <motion.div key={label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:border-accent/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 mx-auto bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-3 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">And many more — we build websites for any industry.</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Simple Process</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Online in 3 Easy Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">No tech skills. No design skills. No stress.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Tell Us About You', desc: 'Fill in a quick form with your business details, pick your colors, upload your logo — takes about 5 minutes.', icon: <Users className="w-7 h-7" />, color: 'from-accent/20 to-accent/5' },
              { step: '02', title: 'We Build Your Preview', desc: 'Our team crafts a professional website tailored to your brand. You get a live preview link to review — no payment required yet.', icon: <Eye className="w-7 h-7" />, color: 'from-blue-500/20 to-blue-500/5' },
              { step: '03', title: 'Approve, Pay & Go Live', desc: 'Happy with your preview? Approve it, pay once, and your site goes live with hosting, SSL, and your domain — all included.', icon: <Rocket className="w-7 h-7" />, color: 'from-green-500/20 to-green-500/5' },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative text-center px-4">
                {i < 2 && <div className="hidden md:block absolute top-12 left-[65%] w-[70%] h-px bg-gradient-to-r from-gray-300 to-transparent" />}
                <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-accent mb-5 relative`}>
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/onboarding" className="group inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-accent/30 hover:scale-105 transition-all duration-300">
              Start Now — It's Free to Preview <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Guarantees ── */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Eye className="w-7 h-7" />, title: 'Preview First', desc: 'See your website before you spend a cent.' },
              { icon: <Shield className="w-7 h-7" />, title: '99.9% Uptime', desc: 'Enterprise-grade hosting with free SSL.' },
              { icon: <Clock className="w-7 h-7" />, title: '<48h Turnaround', desc: 'Most sites delivered within 2 business days.' },
              { icon: <CreditCard className="w-7 h-7" />, title: 'No Hidden Fees', desc: 'One price. Design, hosting, SSL — all included.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-accent shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-24 bg-surface-dark relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Full-Service</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Everything Under One Roof</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Website, hosting, email, SEO, domains — you don't need to shop around.</p>
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

      {/* ── Pricing ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">One price covers everything. No monthly hosting fees for your first year.</p>
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
                <Link to={`/onboarding?package=${pkg.id}`}
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

      {/* ── Testimonials ── */}
      <section className="py-24 bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">Testimonials</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Trusted by SMMEs Across South Africa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Common Questions</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 px-6">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent via-cyan-500 to-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <BadgeCheck className="w-14 h-14 text-white/30 mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to Get Your Business Online?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join hundreds of South African SMMEs who chose the easy way to get a professional website. Takes 5 minutes. Free preview. Zero risk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding" className="group inline-flex items-center justify-center gap-2 bg-white text-primary px-10 py-4 rounded-xl font-extrabold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
