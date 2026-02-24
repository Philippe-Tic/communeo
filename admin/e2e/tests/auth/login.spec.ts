import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/login.page'
import { testUser } from '../../fixtures/test-data'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('should display the login form', async ({ page }) => {
    await expect(page.getByText('Connexion')).toBeVisible()
    await expect(page.getByText("Connectez-vous à votre espace d'administration")).toBeVisible()
    await expect(page.getByPlaceholder('votre@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('Votre mot de passe')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.login(testUser.email, testUser.password)
    await loginPage.expectOnDashboard()

    // Verify JWT is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword')
    // Wait for error to appear
    await page.waitForTimeout(1000)
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await loginPage.submit()
    await expect(page.getByText("L'email est requis")).toBeVisible()
  })

  test('should show password validation error', async ({ page }) => {
    await loginPage.fillEmail(testUser.email)
    await loginPage.submit()
    await expect(page.getByText('Le mot de passe est requis')).toBeVisible()
  })

  test('should have forgot password link', async ({ page }) => {
    await expect(loginPage.forgotPasswordLink).toBeVisible()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
