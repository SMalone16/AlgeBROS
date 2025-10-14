import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    css: false,
    reporters: ['default'],
    /**
     * TODO: Enable coverage thresholds and browser-like smoke tests once the
     * interactive MVP components are ready.
     */
  },
})
