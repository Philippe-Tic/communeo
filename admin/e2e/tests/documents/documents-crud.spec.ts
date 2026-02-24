import { test, expect } from '@playwright/test'
import { OfficialDocumentFormPage } from '../../pages/official-document-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const api = new ApiClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testFilesDir = path.resolve(__dirname, '../../fixtures/test-files')

test.describe('Official Documents CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/official-documents')
  })

  test('should display documents list', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()
  })

  test('should create a new document with PDF upload', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    await form.fillTitle('PV Conseil Municipal Février 2026')
    await form.fillDescription('Procès-verbal de la séance ordinaire.')
    await form.fillReferenceNumber('PV-2026-02')
    await form.selectDocumentType('Procès-verbal de conseil municipal')
    await form.fillYear(2026)
    await form.fillDocumentDate('2026-02-12')
    await form.fillSessionDate('2026-02-12')
    await form.selectStatus('Publié')
    await form.uploadMainFile(path.join(testFilesDir, 'deliberation.pdf'))

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/documents')
  })

  test('should create a deliberation document', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    await form.fillTitle('Délibération Budget Primitif 2026')
    await form.fillReferenceNumber('DEL-2026-015')
    await form.selectDocumentType('Délibération')
    await form.fillYear(2026)
    await form.fillDocumentDate('2026-02-12')
    await form.selectStatus('Publié')
    await form.uploadMainFile(path.join(testFilesDir, 'deliberation.pdf'))

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should view document detail', async ({ page }) => {
    // Create via API first (without file upload)
    const { data } = await api.createOfficialDocument({
      title: 'Document détail test',
      slug: 'document-detail-test',
      document_type: 'deliberation',
      year: 2026,
      document_date: '2026-01-15',
      status: 'published',
    })

    await page.goto(`/documents/${data.documentId}`)
    await expect(page.getByRole('heading', { name: 'Document détail test' })).toBeVisible()
  })

  test('should delete a document', async ({ page }) => {
    const { data } = await api.createOfficialDocument({
      title: 'Document à supprimer',
      slug: 'doc-a-supprimer',
      document_type: 'autre',
      year: 2026,
      document_date: '2026-01-01',
      status: 'draft',
    })

    await page.goto(`/documents/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'supprimé')
  })

  test('should list all document types', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    // Find the document type combobox
    const comboboxes = page.getByRole('combobox')
    await comboboxes.first().click()

    await expect(page.getByRole('option', { name: 'Procès-verbal de conseil municipal' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Délibération' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Arrêté' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Budget primitif' })).toBeVisible()

    await page.keyboard.press('Escape')
  })
})
