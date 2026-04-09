import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe, ShoppingCart, DollarSign, Clock, Loader2, ArrowRight, Rocket
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalOrders: number
  liveOrders: number
  revenue: number
  pending: number
}

interface RecentOrder {
  id: string
  package: string
  status: string
  amount_cents: number
  created_at: string
  profiles: { full_name: string | null; email: string } | null
  client_sites: { business_name: string; build_status: string }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, liveOrders: 0, revenue: 0, pending: 0 })
  const [recent, setRecent] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: orders } = await supabase.from('orders').select('status, amount_cents')
      if (orders) {
        setStats({
          totalOrders: orders.length,
          liveOrders: orders.filter((o) => o.status === 'live' || o.status === 'deployed').length,
          revenue: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.amount_cents, 0),
          pending: orders.filter((o) => o.status === 'pending' || o.status === 'payment_pending').length,
        })
      }

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email), client_sites(business_name, build_status)')
        .order('created_at', { ascending: false })
        .limit(10)
      setRecent((recentOrders as unknown as RecentOrder[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Live Sites', value: stats.liveOrders, icon: Globe, color: 'bg-green-50 text-green-600' },
    { label: 'Revenue', value: `R${(stats.revenue / 100).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
  ]

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{s.label}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-accent text-sm font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.map((order) => {
              const site = order.client_sites?.[0]
              return (
                <Link
                  key={order.id}
                  to={site ? `/admin/sites/${site.business_name}` : '#'}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {site?.business_name || 'No site yet'}
                    </span>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {order.profiles?.full_name || order.profiles?.email} &middot; {order.package}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      R{(order.amount_cents / 100).toLocaleString()}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      order.status === 'live' ? 'bg-green-100 text-green-700' :
                      order.status === 'building' ? 'bg-slate-100 text-slate-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    {site?.build_status === 'pending' && (
                      <Rocket className="w-4 h-4 text-accent" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
