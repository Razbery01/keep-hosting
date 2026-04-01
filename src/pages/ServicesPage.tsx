import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Palette, Server, Search, Globe, Target,
  ClipboardCheck, Mail, Code, ArrowRight, CheckCircle2
} from 'lucide-react'

const services = [
  {
    icon: <Palette className="w-8 h-8" />,
    title: 'Web Design',
    desc: 'Beautiful, responsive websites tailored to your brand identity and business goals.',
    features: ['Custom design', 'Mobile-responsive', 'SEO-friendly structure', 'Fast load times'],
  },
  {
    icon: <Server className="w-8 h-8" />,
    title: 'Web Hosting',
    desc: 'Enterprise-grade hosting with 99.9% uptime, free SSL, and global CDN.',
    features: ['99.9% uptime SLA', 'Free SSL certificates', 'Global CDN', 'Automatic backups'],
  },
  {
    icon: <Search className="w-8 h-8" />,
    title: 'SEO',
    desc: 'On-page and technical SEO to rank higher on Google and drive organic traffic.',
    features: ['Keyword research', 'On-page optimization', 'Technical SEO audit', 'Monthly reporting'],
  },
  {
    icon: <Globe className="w-8 h-8" />,
    title: 'GEO (Generative Engine Optimization)',
    desc: 'Optimize your content for generative search engines like ChatGPT and Perplexity.',
    features: ['Generative search optimization', 'Structured data', 'Content strategy', 'Visibility monitoring'],
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: 'SEM (Search Engine Marketing)',
    desc: 'Paid search campaigns on Google Ads to drive targeted leads and sales.',
    features: ['Google Ads management', 'Audience targeting', 'A/B testing', 'ROI tracking'],
  },
  {
    icon: <ClipboardCheck className="w-8 h-8" />,
    title: 'Website Audits',
    desc: 'Comprehensive audits covering performance, SEO, accessibility, and security.',
    features: ['Performance scoring', 'SEO analysis', 'Accessibility check', 'Security review'],
  },
  {
    icon: <Mail className="w-8 h-8" />,
    title: 'Google Workspace',
    desc: 'Professional email, Drive, Docs and Calendar — set up and managed for you.',
    features: ['Professional email', 'Google Drive setup', 'User management', 'Ongoing support'],
  },
  {
    icon: <Code className="w-8 h-8" />,
    title: 'Web Applications',
    desc: 'Custom web apps built with modern frameworks to automate and grow your business.',
    features: ['Custom development', 'React/Next.js', 'Database integration', 'API development'],
  },
]

export default function ServicesPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              Everything your business needs to succeed online — from design to marketing, all under one roof.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className={`flex flex-col md:flex-row gap-8 items-start ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                {service.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-500 mb-4">{service.desc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {service.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-accent text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-white/80 mb-8">
            We tailor our services to your unique requirements. Let's chat about what you need.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Contact Us <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
