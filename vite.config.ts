/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/*.{test,spec}.{ts,tsx}',
    ],
    // Keep RLS integration test out of the default run — it needs a real test project
    exclude: ['node_modules', 'dist', 'src/__tests__/rlsNonAdmin.test.ts'],
    pool: 'forks',
    // Sequential file execution (replaces poolOptions.forks.singleFork — removed in vitest v4)
    fileParallelism: false,
    testTimeout: 10000,
  },
})
