import { test, expect } from '@playwright/test'
import { ProfilePage } from '../../pages/profile.page'

test.describe('Profile', () => {
  test('should display profile page', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await expect(page.getByRole('heading', { name: 'Informations personnelles' })).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should display user info in view mode', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await expect(page.getByText('Test', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('User', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible()
  })

  test('should switch to edit mode', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await profile.clickEdit()
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible()
  })

  test('should cancel edit mode', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await profile.clickEdit()
    await profile.cancel()

    // Should be back in view mode
    await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible()
  })

  test('should edit profile and save', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await profile.clickEdit()
    await profile.fillPhone('06 11 22 33 44')
    await profile.save()
    await profile.expectUpdatedToast()
  })

  test('should display password reset section', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()

    await expect(page.getByText('Mot de passe', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réinitialiser mon mot de passe' })).toBeVisible()
  })
})
