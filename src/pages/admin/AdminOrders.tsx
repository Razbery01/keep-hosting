import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowLeft, ExternalLink, Rocket } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface Order {
  id: string
  package: string
  status: string
  amount_cents: number
  domain_name: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
  client_sites: {
    id: string
    business_name: string
    build_status: string
    netlify_url: string | null
    github_url: string | null
  }[]
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [buildingId, setBuildingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, profiles(full_name, email), client_sites(id, business_name, build_status, netlify_url, github_url)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as Order[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function triggerBuild(siteId: string) {
    setBuildingId(siteId)
    try {
      const { error } = await supabase.functions.invoke('build-site', {
        body: { siteId },
      })
      if (error) throw error
      toast.success('Build triggered! The site is being generated.')
      // Refresh orders
      const { data } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email), client_sites(id, business_name, build_status, netlify_url, github_url)')
        .order('created_at', { ascending: false })
      setOrders((data as unknown as Order[]) ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Build failed')
    } finally {
      setBuildingId(null)
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Client</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Business</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Package</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Build</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const site = order.client_sites?.[0]
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-4 px-5">
                        <div className="font-medium text-gray-900">{order.profiles?.full_name || '—'}</div>
                        <div className="text-gray-500 text-xs">{order.profiles?.email}</div>
                      </td>
                      <td className="py-4 px-5 text-gray-700">{site?.business_name || '—'}</td>
                      <td className="py-4 px-5 capitalize text-gray-700">{order.package}</td>
                      <td className="py-4 px-5 text-gray-700">R{(order.amount_cents / 100).toLocaleString()}</td>
                      <td className="py-4 px-5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                          order.status === 'live' ? 'bg-green-100 text-green-700' :
                          order.status === 'building' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-xs ${
                          site?.build_status === 'live' ? 'text-green-600' :
                          site?.build_status === 'failed' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {site?.build_status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          {site && site.build_status === 'pending' && (
                            <button
                              onClick={() => triggerBuild(site.id)}
                              disabled={buildingId === site.id}
                              className="flex items-center gap-1 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent-dark disabled:opacity-50"
                            >
                              {buildingId === site.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Rocket className="w-3 h-3" />
                              )}
                              Build
                            </button>
                          )}
                          {site?.netlify_url && (
                            <a href={site.netlify_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
