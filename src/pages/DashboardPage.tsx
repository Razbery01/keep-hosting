import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Globe, ExternalLink, Clock, CheckCircle2, Loader2, AlertCircle,
  Plus, CreditCard, Eye, Sparkles, Code2, Rocket,
  Check, X, AlertTriangle, ArrowRight, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useBuildStatus } from '../hooks/useBuildStatus'

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

const BUILD_STEPS = [
  { key: 'pending', label: 'Queued', icon: Clock, pct: 5 },
  { key: 'generating', label: 'Designing your site', icon: Sparkles, pct: 30 },
  { key: 'generated', label: 'Code generated', icon: Code2, pct: 55 },
  { key: 'deploying', label: 'Deploying site', icon: Rocket, pct: 75 },
  { key: 'deployed', label: 'Site deployed', icon: CheckCircle2, pct: 90 },
  { key: 'live', label: 'Live!', icon: Globe, pct: 100 },
]

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" />, label: 'In Progress' },
  building: { bg: 'bg-slate-50', text: 'text-slate-700', icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Building' },
  preview_ready: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Eye className="w-4 h-4" />, label: 'Preview Ready' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Paid' },
  deployed: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Deployed' },
  live: { bg: 'bg-green-50', text: 'text-green-700', icon: <Globe className="w-4 h-4" />, label: 'Live' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Failed' },
  deploy_failed: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Deploy Failed' },
  suspended: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Suspended' },
}

function BuildProgress({ buildStatus, siteId }: { buildStatus: string; siteId: string }) {
  const currentIdx = BUILD_STEPS.findIndex((s) => s.key === buildStatus)
  const activeStep = currentIdx >= 0 ? BUILD_STEPS[currentIdx] : BUILD_STEPS[0]
  const pct = activeStep.pct
  const isFailed = buildStatus === 'failed'
  const { events: logs } = useBuildStatus(siteId)
  const [showLogs, setShowLogs] = useState(true)

  // Auto-scroll log container
  useEffect(() => {
    const el = document.getElementById(`log-${siteId}`)
    if (el) el.scrollTop = el.scrollHeight
  }, [logs, siteId])

  function LogStatusIcon({ status }: { status: string }) {
    const cls = 'w-3 h-3'
    if (status === 'success') return <Check className={`${cls} text-emerald-500`} strokeWidth={2.5} aria-hidden />
    if (status === 'error') return <X className={`${cls} text-red-400`} strokeWidth={2.5} aria-hidden />
    if (status === 'warning') return <AlertTriangle className={`${cls} text-amber-500`} strokeWidth={2.5} aria-hidden />
    return <ArrowRight className={`${cls} text-slate-500`} strokeWidth={2.5} aria-hidden />
  }

  return (
    <div className="mt-5 bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {isFailed ? (
              <><AlertCircle className="w-4 h-4 text-red-500" /> Build failed</>
            ) : pct >= 100 ? (
              <><CheckCircle2 className="w-4 h-4 text-green-500" /> Complete!</>
            ) : (
              <><Loader2 className="w-4 h-4 text-accent animate-spin" /> Building your website...</>
            )}
          </h4>
          {!isFailed && <span className="text-xs font-bold text-accent">{pct}%</span>}
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className={`h-full rounded-full ${isFailed ? 'bg-red-400' : 'bg-gradient-to-r from-accent to-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${isFailed ? 100 : pct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {BUILD_STEPS.map((step, i) => {
            const Icon = step.icon
            const done = currentIdx >= i
            const active = currentIdx === i
            return (
              <div key={step.key} className="flex flex-col items-center text-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isFailed && active ? 'bg-red-100 text-red-500' :
                  done ? 'bg-accent/10 text-accent' : 'bg-gray-50 text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] leading-tight font-medium ${
                  done ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live build log */}
      <div className="border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />
            Build Log {logs.length > 0 && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{logs.length}</span>}
          </span>
          <span className="text-[10px]">{showLogs ? 'Hide' : 'Show'}</span>
        </button>

        {showLogs && (
          <div
            id={`log-${siteId}`}
            className="bg-gray-900 text-gray-300 px-5 py-4 font-mono text-xs leading-relaxed max-h-52 overflow-y-auto scroll-smooth"
          >
            {logs.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for build to start...
              </div>
            ) : (
              logs.map((log, i) => {
                const time = new Date(log.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex gap-2 py-0.5"
                  >
                    <span className="text-gray-600 shrink-0">{time}</span>
                    <span className="shrink-0 flex items-center justify-center w-4" aria-hidden>
                      <LogStatusIcon status={log.status} />
                    </span>
                    <span className={log.status === 'error' ? 'text-red-400' : 'text-gray-300'}>{log.message}</span>
                  </motion.div>
                )
              })
            )}
            {!isFailed && pct < 100 && logs.length > 0 && (
              <div className="flex items-center gap-2 text-accent mt-1">
                <span className="inline-block w-1.5 h-3.5 bg-accent animate-pulse rounded-sm" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, client_sites(id, business_name, build_status, netlify_url, live_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Poll for updates when any order is pending or actively building
  useEffect(() => {
    const needsPolling = orders.some((o) => {
      return o.status === 'pending' || o.status === 'building' || o.status === 'deployed'
    })
    if (!needsPolling) return

    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [orders, fetchOrders])

  function orderStatusLocksDelete(status: string) {
    return status === 'paid' || status === 'live' || status === 'deployed'
  }

  async function handleRemoveOrder(orderId: string) {
    if (
      !window.confirm(
        'Remove this website order and all build logs? This cannot be undone. Use this for test or stuck builds you no longer need.'
      )
    ) {
      return
    }
    setRemovingId(orderId)
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) throw error
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      toast.success('Order removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove order')
    } finally {
      setRemovingId(null)
    }
  }

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
              const canRemoveOrder = !orderStatusLocksDelete(order.status)
              const buildStatus = site?.build_status || 'pending'
              const buildStarted = buildStatus !== 'pending'
              const isWaiting = (order.status === 'pending') && !buildStarted && !isPreviewReady && !isPaid
              const isBuilding = (order.status === 'building' || buildStarted) && !isPreviewReady && !isPaid

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
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {canRemoveOrder && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOrder(order.id)}
                            disabled={removingId === order.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {removingId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Remove
                          </button>
                        )}
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.icon}
                          {style.label}
                        </span>
                      </div>
                    </div>

                    {/* Waiting: build is starting up */}
                    {isWaiting && (
                      <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-yellow-600 shrink-0" />
                        <span><strong>Starting your build...</strong> Your website is being queued. The progress tracker will appear in a moment.</span>
                      </div>
                    )}

                    {/* Building: show progress tracker + live logs */}
                    {isBuilding && site && (
                      <BuildProgress buildStatus={buildStatus} siteId={site.id} />
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
