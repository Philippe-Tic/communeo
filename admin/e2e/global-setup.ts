import { chromium, type FullConfig } from '@playwright/test'

const STRAPI_URL = 'http://localhost:1337'
const ADMIN_URL = 'http://localhost:5173'

async function waitForStrapi(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${STRAPI_URL}/_health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Strapi did not become healthy in time')
}

async function globalSetup(_config: FullConfig) {
  await waitForStrapi()

  // Login via API to get JWT
  const loginRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'test@example.com',
      password: 'test123',
    }),
  })

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`)
  }

  const { jwt } = await loginRes.json()

  // Save storageState with JWT in localStorage
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(ADMIN_URL)
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token)
  }, jwt)

  await context.storageState({ path: './e2e/auth-state.json' })
  await browser.close()
}

export default globalSetup
