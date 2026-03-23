import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run all test files in a single forked process — keeps DB state isolated
    // from the main thread without spinning up a new process per file
    pool: 'forks',
    singleFork: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/types/**', 'src/tests/**'],
    },
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-for-unit-tests-only-32chars!!',
    },
  },
})
