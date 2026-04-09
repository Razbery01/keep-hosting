import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface BuildEvent {
  id: string | number
  site_id: string
  event_type: string
  status: string
  message: string
  created_at: string
}

export function useBuildStatus(siteId: string | null) {
  const [events, setEvents] = useState<BuildEvent[]>([])
  const [buildStatus, setBuildStatus] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!siteId) {
      setEvents([])
      setBuildStatus(null)
      return
    }

    let cancelled = false

    async function fetchInitial() {
      const { data } = await supabase
        .from('build_events')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: true })
      if (!cancelled && data) setEvents(data as BuildEvent[])

      const { data: siteRow } = await supabase
        .from('client_sites')
        .select('build_status')
        .eq('id', siteId)
        .single()
      if (!cancelled && siteRow) setBuildStatus((siteRow as { build_status: string }).build_status)
    }

    function startFallbackPolling() {
      if (pollIntervalRef.current) return
      pollIntervalRef.current = setInterval(fetchInitial, 10_000)
    }

    function stopFallbackPolling() {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    fetchInitial()

    const channel = supabase
      .channel(`build-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'build_events',
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as BuildEvent])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_sites',
          filter: `id=eq.${siteId}`,
        },
        (payload) => {
          const row = payload.new as { build_status?: string }
          if (row.build_status) setBuildStatus(row.build_status)
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          stopFallbackPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startFallbackPolling()
        }
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      stopFallbackPolling()
    }
  }, [siteId])

  return { events, buildStatus }
}
