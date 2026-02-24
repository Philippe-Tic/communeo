import { type Page } from '@playwright/test'
import { selectOption, expectSuccessToast, uploadFile } from '../helpers/form-helpers'

export class OfficialDocumentFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/documents/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/documents/${id}/edit`)
  }

  async fillTitle(title: string) {
    await this.page.getByPlaceholder('Titre du document').fill(title)
  }

  async fillSlug(slug: string) {
    await this.page.getByPlaceholder('slug-du-document').fill(slug)
  }

  async fillDescription(desc: string) {
    await this.page.getByPlaceholder('Description du document').fill(desc)
  }

  async fillReferenceNumber(ref: string) {
    await this.page.getByPlaceholder('Ex: DEL-2024-042').fill(ref)
  }

  async selectDocumentType(label: string) {
    await selectOption(this.page, 'Type de document', label)
  }

  async selectStatus(label: string) {
    await selectOption(this.page, 'Statut', label)
  }

  async fillYear(year: number) {
    await this.page.locator('input[type="number"]').fill(String(year))
  }

  async fillDocumentDate(date: string) {
    const dateInputs = this.page.locator('input[type="date"]')
    await dateInputs.first().fill(date)
  }

  async fillSessionDate(date: string) {
    const dateInputs = this.page.locator('input[type="date"]')
    await dateInputs.nth(1).fill(date)
  }

  async uploadMainFile(filePath: string) {
    const fileInputs = this.page.locator('input[type="file"]')
    await fileInputs.first().setInputFiles(filePath)
  }

  async uploadAnnexes(filePaths: string[]) {
    const fileInputs = this.page.locator('input[type="file"]')
    await fileInputs.nth(1).setInputFiles(filePaths)
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Document créé')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Document mis à jour')
  }

  async fillFullDocument(data: {
    title: string
    slug?: string
    description?: string
    reference_number?: string
    document_type?: string
    year?: number
    document_date?: string
    session_date?: string
    status?: string
    filePath?: string
  }) {
    await this.fillTitle(data.title)
    if (data.description) await this.fillDescription(data.description)
    if (data.reference_number) await this.fillReferenceNumber(data.reference_number)
    if (data.document_type) await this.selectDocumentType(data.document_type)
    if (data.year) await this.fillYear(data.year)
    if (data.document_date) await this.fillDocumentDate(data.document_date)
    if (data.session_date) await this.fillSessionDate(data.session_date)
    if (data.status) await this.selectStatus(data.status)
    if (data.filePath) await this.uploadMainFile(data.filePath)
  }
}
