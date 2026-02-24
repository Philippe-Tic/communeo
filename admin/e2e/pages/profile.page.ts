import { expect, type Page } from '@playwright/test'
import { expectSuccessToast } from '../helpers/form-helpers'

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/profile')
  }

  async clickEdit() {
    await this.page.getByRole('button', { name: 'Modifier' }).click()
  }

  async fillFirstName(name: string) {
    await this.page.getByLabel('Prénom').fill(name)
  }

  async fillLastName(name: string) {
    await this.page.getByLabel('Nom').fill(name)
  }

  async fillPhone(phone: string) {
    await this.page.getByPlaceholder('Ex: 06 12 34 56 78').fill(phone)
  }

  async save() {
    await this.page.getByRole('button', { name: 'Enregistrer' }).click()
  }

  async cancel() {
    await this.page.getByRole('button', { name: 'Annuler' }).click()
  }

  async resetPassword() {
    await this.page.getByRole('button', { name: 'Réinitialiser mon mot de passe' }).click()
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Profil mis à jour')
  }

  async expectFieldValue(label: string, value: string) {
    await expect(this.page.getByText(value)).toBeVisible()
  }
}
