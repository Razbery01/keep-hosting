import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Globe, ExternalLink, Clock, CheckCircle2, Loader2, AlertCircle, Plus
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Order {
  id: string
  package: string
  status: string
  amount_cents: number
  domain_name: string | null
  created_at: string
  client_sites: {
    id: string
    business_name: string
    build_status: string
    netlify_url: string | null
    live_url: string | null
  }[]
}

const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  payment_pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  paid: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <CheckCircle2 className="w-4 h-4" /> },
  building: { bg: 'bg-purple-50', text: 'text-purple-700', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  deployed: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> },
  live: { bg: 'bg-green-50', text: 'text-green-700', icon: <Globe className="w-4 h-4" /> },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" /> },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('orders')
      .select('*, client_sites(id, business_name, build_status, netlify_url, live_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as Order[]) ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your websites and orders</p>
          </div>
          <Link
            to="/onboarding"
            className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> New Website
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Get started by choosing a package and building your first website.</p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-dark transition-colors"
            >
              <Plus className="w-5 h-5" /> Create Your Website
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const site = order.client_sites?.[0]
              const style = statusStyles[order.status] || statusStyles.pending
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {site?.business_name || 'Untitled Website'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="capitalize">{order.package} Package</span>
                        <span>R{(order.amount_cents / 100).toLocaleString()}</span>
                        {order.domain_name && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" /> {order.domain_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.icon}
                        {order.status.replace('_', ' ')}
                      </span>
                      {(site?.live_url || site?.netlify_url) && (
                        <a
                          href={site.live_url || site.netlify_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent text-sm font-medium hover:underline"
                        >
                          Visit <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
