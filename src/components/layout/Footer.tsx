import { Link } from 'react-router-dom'
import { Globe, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-dark text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
              <Globe className="w-6 h-6 text-accent" />
              Keep Hosting
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Professional web design and hosting at marginal cost. We build, host, and grow your online presence.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="hover:text-accent transition-colors">Web Design</Link></li>
              <li><Link to="/services" className="hover:text-accent transition-colors">Web Hosting</Link></li>
              <li><Link to="/services" className="hover:text-accent transition-colors">SEO & GEO</Link></li>
              <li><Link to="/services" className="hover:text-accent transition-colors">Google Workspace</Link></li>
              <li><Link to="/services" className="hover:text-accent transition-colors">Web Applications</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link></li>
              <li><Link to="/domains" className="hover:text-accent transition-colors">Domain Search</Link></li>
              <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" />
                hello@keephosting.co.za
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent" />
                +27 XX XXX XXXX
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-accent mt-0.5" />
                South Africa
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Keep Hosting. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
