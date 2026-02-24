import { test, expect } from '@playwright/test'
import { UserFormPage } from '../../pages/user-form.page'
import { ApiClient } from '../../helpers/api-client'

const api = new ApiClient()

test.describe('Users Management', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test('should display users list', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible()
  })

  test('should display the test user in the list', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should open new user form', async ({ page }) => {
    const form = new UserFormPage(page)
    await form.goto()

    // Verify form fields are present
    await expect(page.getByPlaceholder('nom.utilisateur')).toBeVisible()
    await expect(page.getByPlaceholder('email@mairie.fr')).toBeVisible()
    await expect(page.getByPlaceholder('Prénom')).toBeVisible()
    await expect(page.getByPlaceholder('Nom', { exact: true })).toBeVisible()
  })

  test('should show invitation info text', async ({ page }) => {
    await page.goto('/users/new')
    await expect(page.getByText(/recevra un email d'invitation/)).toBeVisible()
  })

  test('should view user detail', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')

    // Click on the test user name button in the table (not the header dropdown)
    await page.getByRole('button', { name: 'Test User @testuser' }).click()
    await expect(page).toHaveURL(/\/users\//)
  })

  test('should list role options', async ({ page }) => {
    await page.goto('/users/new')

    const combobox = page.getByRole('combobox').first()
    await combobox.click()

    await expect(page.getByRole('option', { name: 'Administrateur' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Rédacteur' })).toBeVisible()

    await page.keyboard.press('Escape')
  })
})
