import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Globe, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const preselectedPackage = searchParams.get('package')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Check your email to confirm.')
      navigate(preselectedPackage ? `/onboarding?package=${preselectedPackage}` : '/dashboard')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Globe className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Get Started</h1>
          <p className="text-gray-500 text-sm mt-1">Create your Keep Hosting account</p>
          {preselectedPackage && (
            <span className="inline-block mt-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium capitalize">
              {preselectedPackage} Package
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Min 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Create Account
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
