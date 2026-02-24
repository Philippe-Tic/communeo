import { type Page } from '@playwright/test'
import { selectOption, expectSuccessToast, uploadFile } from '../helpers/form-helpers'

export class AssociationFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/associations/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/associations/${id}/edit`)
  }

  async fillName(name: string) {
    await this.page.getByPlaceholder("Nom de l'association").fill(name)
  }

  async selectCategory(label: string) {
    await selectOption(this.page, 'Catégorie', label)
  }

  async fillDescription(desc: string) {
    await this.page.getByPlaceholder("Description de l'association...").fill(desc)
  }

  async fillContactName(name: string) {
    await this.page.getByPlaceholder('Nom du contact').fill(name)
  }

  async fillContactEmail(email: string) {
    await this.page.getByPlaceholder('email@example.com').fill(email)
  }

  async fillContactPhone(phone: string) {
    await this.page.getByPlaceholder('01 23 45 67 89').fill(phone)
  }

  async fillWebsite(url: string) {
    await this.page.getByPlaceholder('https://www.example.com').fill(url)
  }

  async fillAddress(address: string) {
    await this.page.getByPlaceholder("Adresse de l'association").fill(address)
  }

  async uploadLogo(filePath: string) {
    await uploadFile(this.page, filePath, 'input[type="file"]')
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Association créée')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Association mise à jour')
  }

  async fillFullAssociation(data: {
    name: string
    category?: string
    description?: string
    contact_name?: string
    contact_email?: string
    contact_phone?: string
    website?: string
    address?: string
  }) {
    await this.fillName(data.name)
    if (data.category) await this.selectCategory(data.category)
    if (data.description) await this.fillDescription(data.description)
    if (data.contact_name) await this.fillContactName(data.contact_name)
    if (data.contact_email) await this.fillContactEmail(data.contact_email)
    if (data.contact_phone) await this.fillContactPhone(data.contact_phone)
    if (data.website) await this.fillWebsite(data.website)
    if (data.address) await this.fillAddress(data.address)
  }
}
