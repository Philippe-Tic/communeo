import { test, expect } from '@playwright/test'
import { SiteConfigPage } from '../../pages/site-config.page'

test.describe('Site Configuration', () => {
  test('should display site config page', async ({ page }) => {
    await page.goto('/site')
    await expect(page.getByRole('heading', { name: 'Configuration du site' })).toBeVisible()
  })

  test('should navigate to edit page', async ({ page }) => {
    const config = new SiteConfigPage(page)
    await config.goto()
    await config.clickEdit()
    await expect(page).toHaveURL(/\/site\/edit/)
  })

  test('should display general tab by default', async ({ page }) => {
    await page.goto('/site/edit')
    await expect(page.getByText('Nom du site')).toBeVisible()
    await expect(page.getByPlaceholder('Ex: 01 23 45 67 89')).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    const config = new SiteConfigPage(page)
    await config.gotoEdit()

    // Switch to legal tab
    await config.switchTab('Mentions légales')
    await expect(page.getByText('SIRET')).toBeVisible()

    // Switch to RGPD tab
    await config.switchTab('RGPD')
    await expect(page.getByRole('heading', { name: /RGPD/ })).toBeVisible()

    // Switch to accessibility tab
    await config.switchTab('Accessibilité')
    await expect(page.getByText('Niveau de conformité')).toBeVisible()
  })

  test('should edit general configuration', async ({ page }) => {
    const config = new SiteConfigPage(page)
    await config.gotoEdit()

    // Fill the phone field and verify it was filled
    await config.fillContactPhone('04 90 12 34 56')
    await expect(page.getByPlaceholder('Ex: 01 23 45 67 89')).toHaveValue('04 90 12 34 56')
    // Verify the save button is visible
    await expect(page.getByRole('button', { name: 'Sauvegarder' }).first()).toBeVisible()
  })

  test('should display homepage tab', async ({ page }) => {
    const config = new SiteConfigPage(page)
    await config.gotoEdit()

    await config.switchTab("Page d'accueil")
    // Check hero section fields are present
    await expect(page.getByPlaceholder('Bienvenue à...')).toBeVisible()
  })
})
