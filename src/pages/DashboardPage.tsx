import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Globe, ExternalLink, Clock, CheckCircle2, Loader2, AlertCircle,
  Plus, CreditCard, Eye
} from 'lucide-react'
import { toast } from 'sonner'
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

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" />, label: 'Building Preview' },
  building: { bg: 'bg-purple-50', text: 'text-purple-700', icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Building' },
  preview_ready: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Eye className="w-4 h-4" />, label: 'Preview Ready' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Paid' },
  deployed: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Deployed' },
  live: { bg: 'bg-green-50', text: 'text-green-700', icon: <Globe className="w-4 h-4" />, label: 'Live' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Failed' },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)

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

  async function handlePay(orderId: string) {
    setPayingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
      if (error) throw error
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o))
      )
      toast.success('Payment received — your site will go live shortly!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPayingId(null)
    }
  }

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
          <div className="space-y-5">
            {orders.map((order) => {
              const site = order.client_sites?.[0]
              const style = statusConfig[order.status] || statusConfig.pending
              const previewUrl = site?.netlify_url || site?.live_url
              const isPreviewReady = order.status === 'preview_ready' && previewUrl
              const isPaid = order.status === 'paid' || order.status === 'live' || order.status === 'deployed'

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {site?.business_name || 'Untitled Website'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="capitalize">{order.package} Package</span>
                          <span>R{(order.amount_cents / 100).toLocaleString()}</span>
                          {order.domain_name && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5" /> {order.domain_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ${style.bg} ${style.text}`}>
                        {style.icon}
                        {style.label}
                      </span>
                    </div>

                    {/* Pending: waiting for preview */}
                    {order.status === 'pending' && !previewUrl && (
                      <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <strong>We're preparing your preview.</strong> You'll receive a link to review your website here shortly. No payment is required until you're happy with it.
                      </div>
                    )}

                    {/* Preview ready: show preview + pay CTA */}
                    {isPreviewReady && (
                      <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-5">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <Eye className="w-5 h-5" /> Your preview is ready!
                        </h4>
                        <p className="text-sm text-blue-800 mb-4">
                          Review your website below. Once you're happy, approve and pay to take it live.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-white border border-blue-300 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" /> View Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => handlePay(order.id)}
                            disabled={payingId === order.id}
                            className="inline-flex items-center justify-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-accent-dark transition-colors disabled:opacity-50"
                          >
                            {payingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            Approve & Pay — R{(order.amount_cents / 100).toLocaleString()}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Paid / Live: show visit link */}
                    {isPaid && previewUrl && (
                      <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-green-800">
                          <strong>Payment received.</strong> {order.status === 'live' ? 'Your site is live!' : 'Your site will be live shortly.'}
                        </p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-green-700 text-sm font-semibold hover:underline shrink-0"
                        >
                          Visit Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
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
