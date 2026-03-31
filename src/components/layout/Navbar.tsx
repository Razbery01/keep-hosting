import { useState, useEffect } from 'react'
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
  const [scrolled, setScrolled] = useState(false)
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isHome = location.pathname === '/'
  const navBg = scrolled
    ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm'
    : isHome
      ? 'bg-transparent'
      : 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50'

  const textColor = scrolled || !isHome ? 'text-gray-600' : 'text-gray-300'
  const logoColor = scrolled || !isHome ? 'text-primary' : 'text-white drop-shadow-md'
  const accentColor = scrolled || !isHome ? 'text-accent' : 'text-accent'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          <Link to="/" className={`flex items-center gap-2.5 font-extrabold text-xl transition-colors ${logoColor}`}>
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
                  location.pathname === to
                    ? `${accentColor} bg-accent/10`
                    : `${textColor} hover:text-accent hover:bg-accent/5`
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
                  <Link to="/admin" className={`text-sm font-medium ${textColor} hover:text-accent transition-colors`}>
                    Admin
                  </Link>
                )}
                <Link to="/dashboard" className={`text-sm font-medium ${textColor} hover:text-accent transition-colors`}>
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className={`text-sm font-medium ${textColor} hover:text-accent transition-colors`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`text-sm font-semibold ${textColor} hover:text-accent transition-colors px-3 py-2`}>
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

          <button onClick={() => setOpen(!open)} className={`md:hidden p-2 ${scrolled || !isHome ? 'text-gray-600' : 'text-white'}`}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-xl">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`block py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === to ? 'text-accent bg-accent/10' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setOpen(false) }} className="block w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
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
