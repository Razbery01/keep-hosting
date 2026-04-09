import { describe, it } from 'vitest'

describe('GEN-09 — useBuildStatus Realtime', () => {
  it.todo('subscribes to build_events postgres_changes channel filtered by site_id')
  it.todo('subscribes to client_sites UPDATE filtered by id')
  it.todo('appends INSERT payload.new to events state')
  it.todo('updates buildStatus on client_sites UPDATE')
  it.todo('starts 10s polling fallback on CHANNEL_ERROR status')
  it.todo('clears polling interval on SUBSCRIBED status')
  it.todo('unsubscribes and clears interval on unmount')
})
