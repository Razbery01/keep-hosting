import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, Shield, Globe, Palette, Server, Search, Target,
  ClipboardCheck, Mail, Code, CheckCircle2, Sparkles,
  Monitor, Star, ChevronDown, X as XIcon,
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-dark via-primary-dark/80 to-dark" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
          <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-light/10 rounded-full blur-[160px]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}>
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 text-accent px-5 py-2.5 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" /> Turnkey Websites for South African SMMEs
            </motion.span>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.05] mb-8 tracking-tight">
              <span className="text-white">Your Business</span><br />
              <span className="text-white">Deserves a </span>
              <span className="bg-gradient-to-r from-accent via-cyan-300 to-accent bg-clip-text text-transparent">Great Website</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              We build, host, and manage your entire web presence — so you can focus on running your business.
              <span className="text-gray-300"> Preview before you pay.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/onboarding" className="group inline-flex items-center justify-center gap-2.5 bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(0,212,255,0.15)] hover:shadow-[0_0_50px_rgba(0,212,255,0.35)] hover:scale-[1.02] transition-all duration-300">
                Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm text-white px-10 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 border border-white/10">
                View Pricing
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
              {['No coding needed', 'Preview before you pay', 'From R999 once-off'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent/70" /> {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Floating glass cards */}
          <div className="hidden lg:block">
            <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-36 right-4 xl:right-0 bg-white/5 backdrop-blur-2xl border border-white/10 text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 bg-accent/15 rounded-xl flex items-center justify-center"><Zap className="w-5 h-5 text-accent" /></div>
              Lightning Fast
            </motion.div>
            <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-28 left-4 xl:left-0 bg-white/5 backdrop-blur-2xl border border-white/10 text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center"><Monitor className="w-5 h-5 text-green-400" /></div>
              Fully Responsive
            </motion.div>
            <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-56 left-8 xl:left-4 bg-white/5 backdrop-blur-2xl border border-white/10 text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-purple-400" /></div>
              SSL Included
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
              { value: '50+', label: 'Sites Delivered', accent: 'text-accent' },
              { value: '99.9%', label: 'Uptime SLA', accent: 'text-green-500' },
              { value: '<48h', label: 'Turnaround', accent: 'text-purple-500' },
              { value: 'R0', label: 'Upfront Cost', accent: 'text-amber-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="py-8 px-4 text-center"
              >
                <div className={`text-3xl md:text-4xl font-extrabold tracking-tight ${stat.accent}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1.5 font-semibold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes Us Different ── */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionLabel>Why We're Different</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Not Another Hosting Company</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Other providers give you a control panel and say "good luck." We actually <strong className="text-gray-900">build your website for you</strong> — professionally designed, fully hosted, ready to go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 border border-gray-200">
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
            <div className="bg-gradient-to-br from-accent/5 to-cyan-500/5 rounded-3xl p-8 border-2 border-accent/20 relative shadow-lg shadow-accent/5">
              <div className="absolute -top-3.5 left-8">
                <span className="bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-accent/20">KEEP HOSTING</span>
              </div>
              <h3 className="font-bold text-accent mb-6 text-xs uppercase tracking-widest">Our Turnkey Solution</h3>
              <ul className="space-y-4">
                {['Tell us about your business', 'We design & build everything', 'Hosting & SSL included', 'Domain setup handled', 'SEO optimized from day one', 'Preview before you pay'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-800 font-medium">
                    <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionLabel variant="primary">Built for SMMEs</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">We Help Small Businesses Get Online</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              From bakeries to law firms, plumbers to beauty salons — if you're a South African SMME that needs a professional web presence without the agency price tag, we're for you.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }, i) => (
              <motion.div key={label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gray-50 rounded-2xl p-6 text-center hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group border border-transparent hover:border-gray-100">
                <div className="w-14 h-14 mx-auto bg-white rounded-2xl flex items-center justify-center text-accent mb-4 shadow-sm group-hover:bg-accent group-hover:text-white group-hover:shadow-lg group-hover:shadow-accent/20 transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{label}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">And many more — we build websites for any industry.</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <SectionLabel>Simple Process</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Online in 3 Easy Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">No tech skills. No design skills. No stress.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Tell Us About You', desc: 'Fill in a quick form with your business details, pick your colors, upload your logo — takes about 5 minutes.', icon: <Users className="w-7 h-7" /> },
              { step: '02', title: 'We Build Your Preview', desc: 'Our team crafts a professional website tailored to your brand. You get a live preview link to review — no payment required yet.', icon: <Eye className="w-7 h-7" /> },
              { step: '03', title: 'Approve, Pay & Go Live', desc: 'Happy with your preview? Approve it, pay once, and your site goes live with hosting, SSL, and your domain — all included.', icon: <Rocket className="w-7 h-7" /> },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative text-center group">
                {i < 2 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />}
                <div className="w-20 h-20 mx-auto bg-white rounded-3xl flex items-center justify-center text-accent mb-6 shadow-lg shadow-gray-200/50 group-hover:shadow-accent/10 transition-all duration-300 relative border border-gray-100">
                  {item.icon}
                  <span className="absolute -top-2.5 -right-2.5 w-8 h-8 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-accent/30">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link to="/onboarding" className="group inline-flex items-center gap-2.5 bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-accent/25 hover:scale-[1.02] transition-all duration-300">
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
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-accent shrink-0 border border-white/5">
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
      <section className="py-24 bg-white">
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
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-accent mb-5 shadow-sm group-hover:bg-accent group-hover:text-white group-hover:shadow-lg group-hover:shadow-accent/20 transition-all duration-300">
                  {iconMap[service.icon]}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{service.description}</p>
                <Link to="/services" className="inline-flex items-center gap-1.5 text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 bg-surface relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.04] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
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
                    {pkg.features.slice(0, 6).map((f) => (
                      <li key={f} className={`flex items-start gap-3 text-sm ${pkg.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${pkg.highlighted ? 'text-accent' : 'text-accent/70'}`} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/onboarding?package=${pkg.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                      pkg.highlighted
                        ? 'bg-accent text-white hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02]'
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionLabel>Testimonials</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">Trusted by SMMEs Across South Africa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gray-50 rounded-3xl p-8 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-transparent hover:border-gray-100 group">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-8 text-[15px]">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
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
      <section className="py-24 bg-surface">
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
        <div className="absolute inset-0 bg-dark" />
        <div className="absolute inset-0">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
          <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[140px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <BadgeCheck className="w-14 h-14 text-accent/30 mx-auto mb-8" />
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Ready to Get Your<br />Business Online?
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of South African SMMEs who chose the easy way to get a professional website. Takes 5 minutes. Free preview. Zero risk.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/onboarding" className="group inline-flex items-center justify-center gap-2.5 bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(0,212,255,0.15)] hover:shadow-[0_0_50px_rgba(0,212,255,0.35)] hover:scale-[1.02] transition-all duration-300">
                Build My Website <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all duration-300 border border-white/10">
                Talk to Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
