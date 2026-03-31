import { Link } from 'react-router-dom'
import { Globe, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-dark text-gray-400 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,212,255,0.05),transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2.5 text-white font-extrabold text-xl mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-accent to-cyan-400 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              Keep Hosting
            </div>
            <p className="text-sm leading-relaxed mb-6">
              Professional web design and hosting at marginal cost. We build, host, and grow your online presence with AI-powered technology.
            </p>
            <div className="flex gap-3">
              {['facebook', 'instagram', 'linkedin', 'twitter'].map((social) => (
                <a key={social} href="#" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-accent hover:border-accent hover:text-white transition-all duration-300 text-xs font-bold uppercase">
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Services</h4>
            <ul className="space-y-3 text-sm">
              {['Web Design', 'Web Hosting', 'SEO & GEO', 'SEM', 'Website Audits', 'Google Workspace', 'Web Applications'].map((s) => (
                <li key={s}>
                  <Link to="/services" className="hover:text-accent transition-colors flex items-center gap-1 group">
                    {s} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              {[
                { to: '/pricing', label: 'Pricing' },
                { to: '/domains', label: 'Domain Search' },
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
                { to: '/login', label: 'Client Login' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-accent transition-colors flex items-center gap-1 group">
                    {label} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-accent" />
                </div>
                hello@keephosting.co.za
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                +27 XX XXX XXXX
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                Durban, South Africa
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
          <span>&copy; {new Date().getFullYear()} Keep Hosting. All rights reserved.</span>
          <span className="mt-2 md:mt-0 flex items-center gap-1">
            Built with <span className="text-accent">AI</span> in South Africa
          </span>
        </div>
      </div>
    </footer>
  )
}
