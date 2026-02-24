import { test, expect } from '@playwright/test'
import { EventFormPage } from '../../pages/event-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'

const api = new ApiClient()

test.describe('Events CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/evenements')
  })

  test('should display events list', async ({ page }) => {
    await page.goto('/events')
    await expect(page.getByRole('heading', { name: 'Événements' })).toBeVisible()
  })

  test('should create a new event', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    await form.fillTitle('Événement test E2E')
    await form.fillDescription('<p>Description de l\'événement de test.</p>')
    await form.selectCategory('Culturel')
    await form.fillStartDate('2026-06-15T14:00')
    await form.fillEndDate('2026-06-15T18:00')
    await form.fillLocation('Salle des fêtes')
    await form.fillAddress('1 Place de la Mairie')
    await form.fillOrganizer('Mairie')
    await form.fillContactEmail('contact@test.fr')

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/events')
  })

  test('should create event with registration', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    await form.fillTitle('Tournoi avec inscription')
    await form.fillDescription('<p>Tournoi nécessitant une inscription.</p>')
    await form.selectCategory('Sport')
    await form.fillStartDate('2026-07-14T09:00')
    await form.toggleRegistrationRequired()
    await form.fillMaxParticipants(64)
    await form.fillPrice('5€')

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should edit an existing event', async ({ page }) => {
    const { data } = await api.createEvent({
      title: 'Événement à modifier',
      slug: 'event-a-modifier',
      description: '<p>Description</p>',
      start_date: '2026-06-15T14:00:00.000Z',
      category: 'cultural',
    })

    await page.goto(`/events/${data.documentId}/edit`)
    const form = new EventFormPage(page)
    await form.fillTitle('Événement modifié')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should view event detail', async ({ page }) => {
    const { data } = await api.createEvent({
      title: 'Événement détail',
      slug: 'event-detail',
      description: '<p>Description détaillée</p>',
      start_date: '2026-06-15T14:00:00.000Z',
      category: 'meeting',
      location: 'Mairie',
    })

    await page.goto(`/events/${data.documentId}`)
    await expect(page.getByRole('heading', { name: 'Événement détail' })).toBeVisible()
  })

  test('should delete an event', async ({ page }) => {
    const { data } = await api.createEvent({
      title: 'Événement à supprimer',
      slug: 'event-a-supprimer',
      description: '<p>Description</p>',
      start_date: '2026-06-15T14:00:00.000Z',
      category: 'cultural',
    })

    await page.goto(`/events/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'supprimé')
  })

  test('should create event with featured flag', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    await form.fillTitle('Événement à la une')
    await form.fillDescription('<p>Description</p>')
    await form.selectCategory('Célébration')
    await form.fillStartDate('2026-12-25T10:00')
    await form.toggleFeatured()

    await form.submit()
    await form.expectCreatedToast()
  })
})
