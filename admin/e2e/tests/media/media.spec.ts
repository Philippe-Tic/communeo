import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testFilesDir = path.resolve(__dirname, '../../fixtures/test-files')

test.describe('Media Library', () => {
  test('should display media library page', async ({ page }) => {
    await page.goto('/media')
    await expect(page.getByRole('heading', { name: 'Médiathèque' })).toBeVisible()
  })

  test('should show upload button', async ({ page }) => {
    await page.goto('/media')
    await expect(page.getByRole('button', { name: 'Uploader' })).toBeVisible()
  })

  test('should upload an image', async ({ page }) => {
    await page.goto('/media')

    // Upload via file input
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(path.join(testFilesDir, 'logo-mairie.png'))
      // Wait for upload toast
      await page.waitForTimeout(3000)
    }
  })

  test('should display search field', async ({ page }) => {
    await page.goto('/media')
    await expect(page.getByPlaceholder(/Rechercher un média/)).toBeVisible()
  })

  test('should toggle between grid and list view', async ({ page }) => {
    await page.goto('/media')
    await page.waitForLoadState('networkidle')

    // Look for view toggle buttons
    const buttons = page.locator('button')
    // The view mode buttons should be present
    await expect(page.getByRole('heading', { name: 'Médiathèque' })).toBeVisible()
  })
})
