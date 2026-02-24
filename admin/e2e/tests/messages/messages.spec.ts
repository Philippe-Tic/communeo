import { test, expect } from '@playwright/test'
import { ApiClient } from '../../helpers/api-client'

const api = new ApiClient()

test.describe('Messages (Contact Submissions)', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test('should display messages list page', async ({ page }) => {
    await page.goto('/messages')
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
    await expect(page.getByText('Gérez les messages reçus')).toBeVisible()
  })

  test('should show empty state or list of messages', async ({ page }) => {
    await page.goto('/messages')
    await page.waitForLoadState('networkidle')

    // Either shows messages or empty state
    const hasMessages = await page.locator('tbody tr').count() > 0
    if (!hasMessages) {
      await expect(page.getByText('Aucun message trouvé')).toBeVisible()
    }
  })

  test('should display filter options', async ({ page }) => {
    await page.goto('/messages')

    // Search field
    await expect(page.getByPlaceholder(/Rechercher/)).toBeVisible()
  })

  test('should navigate to message detail', async ({ page }) => {
    await page.goto('/messages')
    await page.waitForLoadState('networkidle')

    const messageRows = page.locator('tbody tr')
    const count = await messageRows.count()

    if (count > 0) {
      await messageRows.first().click()
      await expect(page).toHaveURL(/\/messages\//)
    }
  })
})
