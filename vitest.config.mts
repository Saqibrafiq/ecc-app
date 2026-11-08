import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const FULL_COVERAGE = { branches: 100, functions: 100, lines: 100, statements: 100 }

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // next-intl imports "next/navigation" without an extension, which Node's ESM loader rejects.
    server: { deps: { inline: ['next-intl'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.tsx', 'src/**/*.d.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        // The club rules decide who plays (ADR-0005): every branch is tested.
        'src/domain/**': FULL_COVERAGE,
      },
    },
  },
})
