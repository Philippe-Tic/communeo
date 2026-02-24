import { type Page } from '@playwright/test'
import { selectOption, toggleCheckbox, expectSuccessToast } from '../helpers/form-helpers'

export class AlerteFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/alertes/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/alertes/${id}/edit`)
  }

  async fillTitle(title: string) {
    await this.page.getByPlaceholder('Ex: Alerte météo - Vigilance orange').fill(title)
  }

  async fillMessage(message: string) {
    await this.page.getByPlaceholder('Décrivez l\'alerte en quelques phrases...').fill(message)
  }

  async selectSeverity(label: string) {
    await selectOption(this.page, 'Niveau de gravité', label)
  }

  async toggleActive() {
    await toggleCheckbox(this.page, 'Alerte active')
  }

  async fillDisplayFrom(datetime: string) {
    const inputs = this.page.locator('input[type="datetime-local"]')
    await inputs.first().fill(datetime)
  }

  async fillDisplayUntil(datetime: string) {
    const inputs = this.page.locator('input[type="datetime-local"]')
    await inputs.nth(1).fill(datetime)
  }

  async fillLinkUrl(url: string) {
    await this.page.getByPlaceholder('https://...').fill(url)
  }

  async fillLinkLabel(label: string) {
    await this.page.getByPlaceholder('En savoir plus').fill(label)
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Modifier)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Alerte créée')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Alerte modifiée')
  }

  async fillFullAlerte(data: {
    title: string
    message: string
    severity?: string
    active?: boolean
    display_from?: string
    display_until?: string
    link_url?: string
    link_label?: string
  }) {
    await this.fillTitle(data.title)
    await this.fillMessage(data.message)
    if (data.severity) await this.selectSeverity(data.severity)
    if (data.active) await this.toggleActive()
    if (data.display_from) await this.fillDisplayFrom(data.display_from)
    if (data.display_until) await this.fillDisplayUntil(data.display_until)
    if (data.link_url) await this.fillLinkUrl(data.link_url)
    if (data.link_label) await this.fillLinkLabel(data.link_label)
  }
}
