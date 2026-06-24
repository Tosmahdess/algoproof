// vitest.config.ts
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    passWithNoTests: true,
    // Never pick up tests from nested git worktrees (.claude/worktrees/**): they
    // belong to other branches and run against this src via '@/', producing false reds.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
