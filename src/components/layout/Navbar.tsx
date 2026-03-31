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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Globe className="w-7 h-7 text-accent" />
            Keep Hosting
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium transition-colors hover:text-accent ${
                  location.pathname === to ? 'text-accent' : 'text-gray-600'
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
                  <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-accent">
                    Admin
                  </Link>
                )}
                <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-accent">
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-gray-600 hover:text-accent"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-accent">
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-600">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-2">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="block py-2 text-sm font-medium text-gray-600 hover:text-accent"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-gray-600">
                    Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setOpen(false) }} className="block py-2 text-sm font-medium text-gray-600">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-gray-600">
                    Log In
                  </Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-accent">
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
