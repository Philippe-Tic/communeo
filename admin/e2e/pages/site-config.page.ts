import { type Page } from '@playwright/test'
import { expectSuccessToast } from '../helpers/form-helpers'

export class SiteConfigPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/site')
  }

  async gotoEdit() {
    await this.page.goto('/site/edit')
  }

  async clickEdit() {
    await this.page.getByRole('button', { name: 'Modifier' }).click()
  }

  // General tab (default)
  // Labels lack htmlFor in SiteConfigEdit, so use locator strategies
  async fillName(name: string) {
    await this.page.locator('label:has-text("Nom du site") + input, label:has-text("Nom du site") ~ input').first().fill(name)
  }

  async fillContactEmail(email: string) {
    await this.page.locator('input[type="email"]').first().fill(email)
  }

  async fillContactPhone(phone: string) {
    await this.page.getByPlaceholder('Ex: 01 23 45 67 89').fill(phone)
  }

  async fillAddress(address: string) {
    await this.page.getByPlaceholder('Adresse complète de la mairie').fill(address)
  }

  async fillColors(colors: string) {
    await this.page.getByPlaceholder('{"primary": "#3182ce"').fill(colors)
  }

  // Tab navigation
  async switchTab(tabName: string) {
    await this.page.getByRole('tab', { name: tabName }).click()
  }

  // Legal tab
  async fillSiret(siret: string) {
    await this.page.locator('label:has-text("SIRET") + input, label:has-text("SIRET") ~ input').first().fill(siret)
  }

  async fillPublicationDirector(name: string) {
    await this.page.locator('label:has-text("Directeur de publication") + input, label:has-text("Directeur de publication") ~ input').first().fill(name)
  }

  async fillPublicationDirectorTitle(title: string) {
    await this.page.getByPlaceholder('Ex: Maire').fill(title)
  }

  async fillHebergeurName(name: string) {
    await this.page.locator('label:has-text("Nom de l\'hébergeur") + input, label:has-text("Nom de l\'hébergeur") ~ input').first().fill(name)
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Sauvegarder|Sauvegarde)/ }).first().click()
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Configuration mise à jour')
  }
}
