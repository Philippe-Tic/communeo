import type { FullConfig } from '@playwright/test'

async function globalTeardown(_config: FullConfig) {
  // Cleanup can be added here if needed
  // e.g., delete all test data via API
}

export default globalTeardown
