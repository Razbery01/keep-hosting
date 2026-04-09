import { describe, it } from 'vitest'

describe('GEN-01 — tool_choice forced tool use', () => {
  it.todo('Code Agent uses tool_choice: { type: "tool", name: "deliver_site_files" }')
  it.todo('extracts files[] from tool_use block in finalMessage response')
  it.todo('throws a clear error if no tool_use block is present (should not happen with forced tool_choice)')
  it.todo('Image Agent uses tool_choice with deliver_search_queries tool name')
})
