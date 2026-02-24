import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/login.page'
import { testUser } from '../../fixtures/test-data'

test.describe('Logout', () => {
  test('should logout and clear state', async ({ page }) => {
    const loginPage = new LoginPage(page)

    // First login
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await loginPage.expectOnDashboard()

    // Open user dropdown and click Déconnexion
    // Click on user avatar/menu in header
    const header = page.locator('header')
    await header.getByRole('button').last().click()
    await page.getByText('Déconnexion').click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeNull()
  })
})
