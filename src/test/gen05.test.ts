import { describe, it } from 'vitest'

describe('GEN-05 — client_sites queue state', () => {
  it.todo('increments retry_count on each retry')
  it.todo('sets next_retry_at to now()+backoff on retryable failure')
  it.todo('sets last_attempted_at on every attempt')
  it.todo('logs retry_scheduled to build_events with backoff ms')
})
