import { test, expect } from '@playwright/test'
import { PageFormPage } from '../../pages/page-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'

const api = new ApiClient()

test.describe('Pages CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/pages')
  })

  test('should display pages list', async ({ page }) => {
    await page.goto('/pages')
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible()
  })

  test('should create a new page', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    await form.fillTitle('Page de test E2E')
    await form.fillContent('<h2>Titre</h2><p>Contenu de la page de test.</p>')
    await form.selectStatus('Publié')
    await form.selectTemplate('Par défaut')

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/pages')
  })

  test('should create a child page', async ({ page }) => {
    // Create parent first
    await api.createPage({
      title: 'Page parent',
      slug: 'page-parent',
      content: '<p>Parent</p>',
      status: 'published',
      template: 'default',
    })

    const form = new PageFormPage(page)
    await form.goto()
    await page.waitForLoadState('networkidle')

    await form.fillTitle('Page enfant')
    await form.fillContent('<p>Contenu enfant</p>')
    await form.selectParent('Page parent')
    await form.selectStatus('Publié')

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should edit an existing page', async ({ page }) => {
    const { data } = await api.createPage({
      title: 'Page à modifier',
      slug: 'page-a-modifier',
      content: '<p>Ancien contenu</p>',
      status: 'draft',
      template: 'default',
    })

    await page.goto(`/pages/${data.documentId}/edit`)
    const form = new PageFormPage(page)
    await form.fillTitle('Page modifiée')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should view page detail', async ({ page }) => {
    const { data } = await api.createPage({
      title: 'Page détail',
      slug: 'page-detail',
      content: '<p>Contenu détail</p>',
      status: 'published',
      template: 'default',
    })

    await page.goto(`/pages/${data.documentId}`)
    await expect(page.getByRole('heading', { name: 'Page détail' })).toBeVisible()
  })

  test('should delete a page', async ({ page }) => {
    const { data } = await api.createPage({
      title: 'Page à supprimer',
      slug: 'page-a-supprimer',
      content: '<p>Contenu</p>',
      status: 'draft',
      template: 'default',
    })

    await page.goto(`/pages/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'Page supprimée')
  })

  test('should select different templates', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    await form.fillTitle('Page services')
    await form.fillContent('<p>Contenu services</p>')
    await form.selectTemplate('Services')
    await form.selectStatus('Publié')

    await form.submit()
    await form.expectCreatedToast()
  })
})
