import { test, expect } from '@playwright/test'
import { AssociationFormPage } from '../../pages/association-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'

const api = new ApiClient()

test.describe('Associations CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/associations')
  })

  test('should display associations list', async ({ page }) => {
    await page.goto('/associations')
    await expect(page.getByRole('heading', { name: 'Associations' })).toBeVisible()
  })

  test('should create a new association', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    await form.fillName('AS Saint-Martin Football')
    await form.selectCategory('Sport')
    await form.fillDescription('Club de football fondé en 1952.')
    await form.fillContactName('Patrick Moulin')
    await form.fillContactEmail('contact@foot.fr')
    await form.fillContactPhone('06 23 45 67 89')
    await form.fillWebsite('https://foot-saintmartin.fr')
    await form.fillAddress('Stade Municipal')

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/associations')
  })

  test('should edit an existing association', async ({ page }) => {
    const { data } = await api.createAssociation({
      name: 'Association à modifier',
      category: 'culture',
      description: 'Description initiale',
    })

    await page.goto(`/associations/${data.documentId}/edit`)
    await page.waitForLoadState('networkidle')
    const form = new AssociationFormPage(page)
    // Re-select category since the select may not auto-populate from API value
    await form.selectCategory('Culture')
    await form.fillDescription('Description mise à jour')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should view association detail', async ({ page }) => {
    const { data } = await api.createAssociation({
      name: 'Les Amis de la Bibliothèque',
      category: 'culture',
    })

    await page.goto(`/associations/${data.documentId}`)
    await expect(page.getByRole('heading', { name: 'Les Amis de la Bibliothèque' })).toBeVisible()
  })

  test('should delete an association', async ({ page }) => {
    const { data } = await api.createAssociation({
      name: 'Association à supprimer',
      category: 'autre',
    })

    await page.goto(`/associations/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'supprimé')
  })

  test('should list all association categories', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    const combobox = page.getByRole('combobox').first()
    await combobox.click()

    await expect(page.getByRole('option', { name: 'Sport' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Culture' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Social' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Environnement' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Éducation' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Autre' })).toBeVisible()

    await page.keyboard.press('Escape')
  })
})
