import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, Shield, Globe, Palette, Server, Search, Target,
  ClipboardCheck, Mail, Code, CheckCircle2,
  Star, ChevronDown, X as XIcon, Quote,
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
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
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
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-6 text-left group">
        <span className="text-base font-semibold text-gray-900 group-hover:text-accent transition-colors pr-4">{q}</span>
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${open ? 'bg-accent border-accent rotate-180' : 'border-gray-200 group-hover:border-accent/50'}`}>
          <ChevronDown className={`w-4 h-4 transition-colors duration-300 ${open ? 'text-white' : 'text-gray-400'}`} />
        </div>
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
        <p className="text-gray-500 text-[15px] leading-relaxed pb-6">{a}</p>
      </motion.div>
    </div>
  )
}

function SectionLabel({ children, variant = 'accent' }: { children: React.ReactNode; variant?: 'accent' | 'primary' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${variant === 'accent' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'} px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5`}>
      {children}
    </span>
  )
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-dark">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[150px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-0 w-full">
          <div className="max-w-3xl lg:max-w-none lg:grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="inline-flex items-center gap-2.5 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] text-white/80 px-4 py-2 rounded-full text-sm font-medium mb-8 overflow-hidden"
              >
                <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                Now serving South African SMMEs
              </motion.div>

              <h1 className="text-[2.75rem] leading-[1.08] md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight text-white mb-6">
                Your business<br className="hidden sm:block" /> deserves a website<br className="hidden sm:block" />
                {' '}<span className="relative inline-block">
                  <span className="text-white/95">that works.</span>
                  <motion.span
                    className="absolute -bottom-1.5 left-0 h-[3px] bg-white/30 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.8, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] }}
                  />
                </span>
              </h1>

              <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
                Tell us about your business. We design, build, and host a professional website — ready in under 48 hours. You preview it first and only pay if you love it.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to="/onboarding" className="group relative inline-flex items-center justify-center gap-2.5 bg-accent text-white pl-7 pr-5 py-4 rounded-2xl font-bold text-[17px] overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
                  <span className="relative z-10 flex items-center gap-2.5">Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></span>
                </Link>
                <Link to="/pricing" className="inline-flex items-center justify-center gap-2 text-white px-7 py-4 rounded-2xl font-semibold text-[17px] border border-white/[0.12] hover:bg-white/[0.04] transition-colors duration-200">
                  View Pricing
                </Link>
              </div>

              {/* Social proof strip */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2.5">
                  {['T', 'J', 'N', 'S', 'M'].map((letter, i) => (
                    <motion.div
                      key={letter}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      className="w-9 h-9 rounded-full border-2 border-dark flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: ['#2A4F7F', '#3d5a73', '#1E3A5F', '#4a6680', '#2f4a63'][i], color: '#fff' }}
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="w-3.5 h-3.5 text-gray-500" fill="none" strokeWidth={2} />)}
                  </div>
                  <span className="text-xs text-gray-500">Trusted by <strong className="text-gray-400">50+ businesses</strong> across SA</span>
                </div>
              </div>
            </motion.div>

            {/* Right — animated browser mockup */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="hidden lg:block">
              <div className="relative">
                {/* Glow behind */}
                <div className="absolute -inset-4 bg-accent/[0.06] rounded-3xl blur-2xl" />

                <div className="relative bg-[#0c1524] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
                  {/* Chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 mx-6">
                      <div className="bg-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] text-gray-500 flex items-center gap-2 max-w-[220px] mx-auto">
                        <Shield className="w-3 h-3 text-white/50 shrink-0" />
                        <span className="truncate">yourbusiness.co.za</span>
                      </div>
                    </div>
                  </div>

                  {/* Animated wireframe */}
                  <div className="p-5 space-y-4">
                    {[
                      { delay: 0.5, children: (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md bg-accent/30" /><div className="h-2.5 w-16 bg-white/15 rounded" /></div>
                          <div className="flex gap-3">{[1,2,3].map(n => <div key={n} className="h-2 w-10 bg-white/8 rounded" />)}<div className="h-6 w-14 bg-accent/30 rounded-md" /></div>
                        </div>
                      )},
                      { delay: 0.8, children: (
                        <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl p-5 border border-accent/10">
                          <div className="h-4 w-40 bg-white/15 rounded mb-2" />
                          <div className="h-7 w-56 bg-white/10 rounded-lg mb-3" />
                          <div className="h-2.5 w-48 bg-white/[0.06] rounded mb-4" />
                          <div className="flex gap-2"><div className="h-8 w-24 bg-accent/40 rounded-lg" /><div className="h-8 w-24 bg-white/[0.06] rounded-lg" /></div>
                        </div>
                      )},
                      { delay: 1.1, children: (
                        <div className="grid grid-cols-3 gap-2.5">
                          {[1,2,3].map(n => (
                            <div key={n} className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06]">
                              <div className="w-7 h-7 rounded-lg bg-accent/15 mb-2.5" />
                              <div className="h-2.5 w-full bg-white/10 rounded mb-1.5" />
                              <div className="h-2 w-3/4 bg-white/[0.05] rounded" />
                            </div>
                          ))}
                        </div>
                      )},
                      { delay: 1.4, children: (
                        <div className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
                          <div className="space-y-1.5"><div className="h-2.5 w-32 bg-white/10 rounded" /><div className="h-2 w-24 bg-white/[0.05] rounded" /></div>
                          <div className="h-7 w-20 bg-accent/25 rounded-md" />
                        </div>
                      )},
                    ].map((block, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: block.delay, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] }}
                      >
                        {block.children}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Floating badges */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8, duration: 0.4 }}
                  className="absolute -top-4 -right-4 bg-white shadow-lg shadow-black/10 text-gray-900 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 border border-gray-100"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /></div>
                  Site Live!
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.0, duration: 0.4 }}
                  className="absolute -bottom-4 -left-4 bg-white shadow-lg shadow-black/10 text-gray-900 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 border border-gray-100"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><Zap className="w-4 h-4 text-primary" /></div>
                  Under 48h
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Stats ── */}
      <section className="py-0 relative -mt-8 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { value: '50+', label: 'Sites Delivered' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<48h', label: 'Turnaround' },
              { value: 'R0', label: 'Upfront Cost' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="py-8 px-4 text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1.5 font-semibold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes Us Different ── */}
      <section className="py-28 bg-surface bg-dots-light relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-accent/[0.05] rounded-full -translate-y-1/2 -translate-x-1/3 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/[0.06] rounded-full translate-y-1/2 translate-x-1/3 blur-[100px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — image + text */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <SectionLabel>Why We're Different</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Not Another<br />Hosting Company</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Other providers give you a control panel and say "good luck." We actually <strong className="text-gray-900">build your website for you</strong> — professionally designed, fully hosted, ready to go.
              </p>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/40">
                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80" alt="Team collaborating on website design" className="w-full h-64 object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-white text-sm font-semibold">We handle the design, code, and deployment — you focus on your business.</p>
                </div>
              </div>
            </motion.div>

            {/* Right — comparison */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="space-y-5">
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm bg-diagonal">
                <h3 className="font-bold text-gray-400 mb-6 text-xs uppercase tracking-widest">Traditional Hosting</h3>
                <ul className="space-y-4">
                  {['Buy hosting separately', 'Learn a website builder', 'Design it yourself', 'Figure out DNS & SSL', 'Handle your own SEO', 'No support for design'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <XIcon className="w-3.5 h-3.5 text-gray-400" />
                      </span>
                      <span className="line-through">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-gray-200 relative shadow-md shadow-gray-200/40 ring-1 ring-primary/5">
                <div className="absolute -top-3.5 left-8">
                  <span className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">KEEP HOSTING</span>
                </div>
                <h3 className="font-bold text-primary mb-6 text-xs uppercase tracking-widest">Our Turnkey Solution</h3>
                <ul className="space-y-4">
                  {['Tell us about your business', 'We design & build everything', 'Hosting & SSL included', 'Domain setup handled', 'SEO optimized from day one', 'Preview before you pay'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-800 font-medium">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark via-primary-dark to-primary" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/[0.06] rounded-full blur-[150px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Built for SMMEs</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">We Help Small Businesses Get Online</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              From bakeries to law firms, plumbers to beauty salons — if you're a South African SMME that needs a professional web presence, we're for you.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }, i) => (
              <motion.div key={label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 text-center border border-white/[0.08] hover:bg-white/[0.12] hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 mx-auto bg-white/10 rounded-2xl flex items-center justify-center text-white/90 mb-4 group-hover:bg-white/20 group-hover:text-white transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-white/80">{label}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">And many more — we build websites for any industry.</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-28 bg-white bg-grid relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Simple Process</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Online in 3 Easy Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">No tech skills. No design skills. No stress.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { step: '1', title: 'Tell Us About You', desc: 'Fill in a quick form with your business details, pick your colors, upload your logo — takes about 5 minutes.', icon: <Users className="w-7 h-7" />, gradient: 'from-slate-50 to-gray-50/80' },
              { step: '2', title: 'We Build Your Preview', desc: 'We craft a professional website tailored to your brand. You get a live preview link to review — no payment required yet.', icon: <Eye className="w-7 h-7" />, gradient: 'from-gray-50 to-slate-50/90' },
              { step: '3', title: 'Approve, Pay & Go Live', desc: 'Happy with your preview? Approve it, pay once, and your site goes live with hosting, SSL, and your domain — all included.', icon: <Rocket className="w-7 h-7" />, gradient: 'from-slate-50/90 to-gray-50' },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`relative bg-gradient-to-br ${item.gradient} rounded-3xl p-8 border border-gray-100 group hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300`}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-gray-100">
                    {item.icon}
                  </div>
                  <span className="text-5xl font-extrabold text-gray-200/60">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link to="/onboarding" className="group inline-flex items-center gap-2.5 bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              Start Now — It's Free to Preview <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Guarantees ── */}
      <section className="py-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/50 via-transparent to-primary-dark/50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: <Eye className="w-6 h-6" />, title: 'Preview First', desc: 'See your website before you spend a cent.' },
              { icon: <Shield className="w-6 h-6" />, title: '99.9% Uptime', desc: 'Enterprise-grade hosting with free SSL.' },
              { icon: <Clock className="w-6 h-6" />, title: '<48h Turnaround', desc: 'Most sites delivered within 2 business days.' },
              { icon: <CreditCard className="w-6 h-6" />, title: 'No Hidden Fees', desc: 'One price. Design, hosting, SSL — all included.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white/90 shrink-0 border border-white/10">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-28 bg-surface bg-dots-light relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.04] rounded-full translate-y-1/2 -translate-x-1/3 blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionLabel variant="primary">Full-Service</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Everything Under One Roof</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">Website, hosting, email, SEO, domains — you don't need to shop around.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((service, i) => (
              <motion.div key={service.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-gray-50 rounded-2xl p-7 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-gray-100">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary mb-5 shadow-sm border border-gray-100 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                  {iconMap[service.icon]}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{service.description}</p>
                <Link to="/services" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portfolio Preview ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-dark via-primary-dark to-dark" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Our Work</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">Websites We've Built</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Every site is custom-designed based on the client's brand. Here's a taste of what we deliver.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Fresh Roots Catering', industry: 'Food & Hospitality', color: '#57534e', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80' },
              { name: 'ProFix Plumbing', industry: 'Construction & Trades', color: '#44403c', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80' },
              { name: 'Lumina Beauty Studio', industry: 'Beauty & Wellness', color: '#78716c', img: 'https://images.unsplash.com/photo-1560750588-73b555e41656?auto=format&fit=crop&w=600&q=80' },
            ].map((project, i) => (
              <motion.div key={project.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={project.img} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{project.industry}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{project.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-28 bg-white bg-grid relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.04] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/[0.05] rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">One price covers everything. No monthly hosting fees for your first year.</p>
          </div>
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
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    </div>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-white/15 text-white text-xs font-bold px-5 py-2 rounded-full border border-white/20 flex items-center gap-1.5 whitespace-nowrap">
                        <Star className="w-3.5 h-3.5" fill="none" strokeWidth={2} aria-hidden /> Most Popular
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
                    {pkg.features.slice(0, 6).map((f) => (
                      <li key={f} className={`flex items-start gap-3 text-sm ${pkg.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${pkg.highlighted ? 'text-white/90' : 'text-primary/80'}`} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/onboarding?package=${pkg.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                      pkg.highlighted
                        ? 'bg-white text-primary hover:bg-white/95 hover:shadow-lg'
                        : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg'
                    }`}>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 bg-surface relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full -translate-y-1/2 -translate-x-1/3 blur-[150px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Testimonials</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Trusted by SMMEs Across South Africa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-gray-100 hover:-translate-y-1 relative">
                <Quote className="absolute top-6 right-6 w-10 h-10 text-gray-200" strokeWidth={1.25} aria-hidden />
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-gray-400" fill="none" strokeWidth={1.75} />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-8 text-[15px] relative">{t.text}</p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: ['#1E3A5F', '#2A4F7F', '#3d5a73'][i] }}>
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
      <section className="py-28 bg-surface bg-dots-light relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[150px]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionLabel variant="primary">FAQ</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-5 tracking-tight">Common Questions</h2>
          </div>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm px-8">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px w-12 bg-accent/50" />
              <BadgeCheck className="w-6 h-6 text-accent/50" />
              <div className="h-px w-12 bg-accent/50" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Ready to Get Your<br />Business Online?
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of South African SMMEs who chose the easy way to get a professional website. Takes 5 minutes. Free preview. Zero risk.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/onboarding" className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-10 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all duration-200">
                Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors duration-200 border border-white/15">
                Talk to Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
