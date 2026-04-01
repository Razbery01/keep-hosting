import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Globe } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/domains', label: 'Domains' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()

  const linkInactive = 'text-gray-800 hover:text-primary hover:bg-gray-50'
  const linkActive = 'text-primary font-semibold bg-primary/10'
  const authMuted = 'text-gray-800 hover:text-primary'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white text-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 font-extrabold text-xl text-primary transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-accent to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            Keep Hosting
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === to ? linkActive : linkInactive
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className={`text-sm font-medium transition-colors ${authMuted}`}>
                    Admin
                  </Link>
                )}
                <Link to="/dashboard" className={`text-sm font-medium transition-colors ${authMuted}`}>
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className={`text-sm font-medium transition-colors ${authMuted}`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`text-sm font-semibold transition-colors px-3 py-2 ${authMuted}`}>
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-accent/30 hover:scale-105 transition-all duration-300"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button type="button" onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-800">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-xl text-gray-900">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`block py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === to ? linkActive : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50">
                    Dashboard
                  </Link>
                  <button type="button" onClick={() => { signOut(); setOpen(false) }} className="block w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50">
                    Log In
                  </Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-bold text-white bg-accent text-center">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
