import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const channelOn = vi.fn().mockReturnThis()
const channelSubscribe = vi.fn().mockReturnThis()
const removeChannel = vi.fn()
const mockChannel = { on: channelOn, subscribe: channelSubscribe }

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: (...args: unknown[]) => removeChannel(...args),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: { build_status: null }, error: null }),
    })),
  },
}))

import { useBuildStatus } from '../hooks/useBuildStatus'
import { supabase } from '../lib/supabase'

describe('GEN-09 — useBuildStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    channelOn.mockReturnThis()
    channelSubscribe.mockReturnThis()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not subscribe when siteId is null', () => {
    renderHook(() => useBuildStatus(null))
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('creates a build-{siteId} channel', () => {
    renderHook(() => useBuildStatus('abc-123'))
    expect(supabase.channel).toHaveBeenCalledWith('build-abc-123')
  })

  it('subscribes to build_events INSERT and client_sites UPDATE', () => {
    renderHook(() => useBuildStatus('abc-123'))
    expect(channelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'build_events', filter: 'site_id=eq.abc-123' }),
      expect.any(Function),
    )
    expect(channelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', table: 'client_sites', filter: 'id=eq.abc-123' }),
      expect.any(Function),
    )
  })

  it('starts 10s polling on CHANNEL_ERROR status', () => {
    renderHook(() => useBuildStatus('abc-123'))
    const subscribeCallback = channelSubscribe.mock.calls[0][0]
    act(() => { subscribeCallback('CHANNEL_ERROR') })
    expect(vi.getTimerCount()).toBeGreaterThan(0)
  })

  it('clears polling on SUBSCRIBED status', () => {
    renderHook(() => useBuildStatus('abc-123'))
    const subscribeCallback = channelSubscribe.mock.calls[0][0]
    act(() => { subscribeCallback('CHANNEL_ERROR') })
    act(() => { subscribeCallback('SUBSCRIBED') })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('removes channel on unmount', () => {
    const { unmount } = renderHook(() => useBuildStatus('abc-123'))
    unmount()
    expect(removeChannel).toHaveBeenCalled()
  })
})
