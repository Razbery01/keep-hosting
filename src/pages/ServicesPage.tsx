import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Palette, Server, Search, Globe, Target,
  ClipboardCheck, Mail, Code, ArrowRight, CheckCircle2
} from 'lucide-react'

const services = [
  {
    icon: <Palette className="w-7 h-7" />,
    title: 'Web Design',
    desc: 'Beautiful, responsive websites tailored to your brand identity and business goals.',
    features: ['Custom design', 'Mobile-responsive', 'SEO-friendly structure', 'Fast load times'],
  },
  {
    icon: <Server className="w-7 h-7" />,
    title: 'Web Hosting',
    desc: 'Enterprise-grade hosting with 99.9% uptime, free SSL, and global CDN.',
    features: ['99.9% uptime SLA', 'Free SSL certificates', 'Global CDN', 'Automatic backups'],
  },
  {
    icon: <Search className="w-7 h-7" />,
    title: 'SEO',
    desc: 'On-page and technical SEO to rank higher on Google and drive organic traffic.',
    features: ['Keyword research', 'On-page optimization', 'Technical SEO audit', 'Monthly reporting'],
  },
  {
    icon: <Globe className="w-7 h-7" />,
    title: 'GEO (Generative Engine Optimization)',
    desc: 'Optimize your content for generative search engines like ChatGPT and Perplexity.',
    features: ['Generative search optimization', 'Structured data', 'Content strategy', 'Visibility monitoring'],
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: 'SEM (Search Engine Marketing)',
    desc: 'Paid search campaigns on Google Ads to drive targeted leads and sales.',
    features: ['Google Ads management', 'Audience targeting', 'A/B testing', 'ROI tracking'],
  },
  {
    icon: <ClipboardCheck className="w-7 h-7" />,
    title: 'Website Audits',
    desc: 'Comprehensive audits covering performance, SEO, accessibility, and security.',
    features: ['Performance scoring', 'SEO analysis', 'Accessibility check', 'Security review'],
  },
  {
    icon: <Mail className="w-7 h-7" />,
    title: 'Google Workspace',
    desc: 'Professional email, Drive, Docs and Calendar — set up and managed for you.',
    features: ['Professional email', 'Google Drive setup', 'User management', 'Ongoing support'],
  },
  {
    icon: <Code className="w-7 h-7" />,
    title: 'Web Applications',
    desc: 'Custom web apps built with modern frameworks to automate and grow your business.',
    features: ['Custom development', 'React/Next.js', 'Database integration', 'API development'],
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
}

export default function ServicesPage() {
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
              <span className="text-accent text-sm font-semibold uppercase tracking-wider">Services</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
              Everything Your Business<br />Needs to Succeed Online
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              From design to marketing, all under one roof. No need to shop around — we handle it all.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service, i) => (
              <motion.div key={service.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-transparent hover:border-gray-100">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-accent shrink-0 shadow-sm group-hover:bg-accent group-hover:text-white group-hover:shadow-lg group-hover:shadow-accent/20 transition-all duration-300">
                    {service.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">{service.desc}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {service.features.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-accent/70 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">Need a Custom Solution?</h2>
          <p className="text-gray-400 mb-8 text-lg leading-relaxed">
            We tailor our services to your unique requirements. Let's chat about what you need.
          </p>
          <Link to="/contact" className="group inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all duration-200">
            Contact Us <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  )
}
