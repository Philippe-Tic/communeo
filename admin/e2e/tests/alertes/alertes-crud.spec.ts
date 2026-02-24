import { test, expect } from '@playwright/test'
import { AlerteFormPage } from '../../pages/alerte-form.page'
import { ApiClient } from '../../helpers/api-client'
import { confirmDialog, expectSuccessToast } from '../../helpers/form-helpers'

const api = new ApiClient()

test.describe('Alertes CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/alertes')
  })

  test('should display alertes list', async ({ page }) => {
    await page.goto('/alertes')
    await expect(page.getByRole('heading', { name: 'Alertes' })).toBeVisible()
  })

  test('should create a warning alerte', async ({ page }) => {
    const form = new AlerteFormPage(page)
    await form.goto()

    await form.fillTitle('Coupure d\'eau programmée')
    await form.fillMessage('Une coupure d\'eau est prévue le jeudi de 9h à 14h.')
    await form.selectSeverity('Avertissement')
    await form.toggleActive()
    await form.fillDisplayFrom('2026-03-04T08:00')
    await form.fillDisplayUntil('2026-03-06T15:00')
    await form.fillLinkUrl('https://example.com/services')
    await form.fillLinkLabel('Voir les services')

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/alertes')
  })

  test('should create an info alerte', async ({ page }) => {
    const form = new AlerteFormPage(page)
    await form.goto()

    await form.fillTitle('Inscriptions périscolaires')
    await form.fillMessage('Les inscriptions sont ouvertes du 1er au 30 avril.')
    await form.selectSeverity('Information')
    await form.toggleActive()

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should edit an existing alerte', async ({ page }) => {
    const { data } = await api.createAlerte({
      title: 'Alerte à modifier',
      message: 'Message initial',
      severity: 'info',
      active: true,
    })

    await page.goto(`/alertes/${data.documentId}/edit`)
    const form = new AlerteFormPage(page)
    await form.fillMessage('Message mis à jour')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should delete an alerte', async ({ page }) => {
    const { data } = await api.createAlerte({
      title: 'Alerte à supprimer',
      message: 'Message',
      severity: 'info',
      active: false,
    })

    await page.goto('/alertes')
    // Alertes are managed from the list — click the delete icon button (last action button)
    const alerteCard = page.locator('div').filter({ hasText: /Alerte à supprimer/ }).first()
    // The delete button is the last button in the actions area (trash icon)
    await alerteCard.locator('button').last().click()
    // Confirm in the AlertDialog
    await confirmDialog(page, 'Supprimer')
    await expectSuccessToast(page, 'supprimé')
  })

  test('should list severity levels', async ({ page }) => {
    const form = new AlerteFormPage(page)
    await form.goto()

    const combobox = page.getByRole('combobox').first()
    await combobox.click()

    await expect(page.getByRole('option', { name: 'Information' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Avertissement' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Critique' })).toBeVisible()

    await page.keyboard.press('Escape')
  })
})
