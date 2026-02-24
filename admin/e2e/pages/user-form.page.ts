import { type Page } from '@playwright/test'
import { selectOption, toggleCheckbox, expectSuccessToast } from '../helpers/form-helpers'

export class UserFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/users/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/users/${id}/edit`)
  }

  async fillUsername(username: string) {
    await this.page.getByPlaceholder('nom.utilisateur').fill(username)
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('email@mairie.fr').fill(email)
  }

  async fillFirstName(name: string) {
    await this.page.getByPlaceholder('Prénom').fill(name)
  }

  async fillLastName(name: string) {
    await this.page.getByPlaceholder('Nom').fill(name)
  }

  async fillPhone(phone: string) {
    await this.page.getByPlaceholder('01 23 45 67 89').fill(phone)
  }

  async selectRole(label: string) {
    await selectOption(this.page, 'Rôle', label)
  }

  async toggleActive() {
    await toggleCheckbox(this.page, 'Compte actif')
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Envoyer l'invitation|Mettre à jour)$/ }).click()
  }

  async expectInvitationToast() {
    await expectSuccessToast(this.page, 'Invitation envoyée')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Utilisateur mis à jour')
  }

  async resetPassword() {
    await this.page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click()
  }

  async fillFullUser(data: {
    username: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    municipality_role?: string
  }) {
    await this.fillUsername(data.username)
    await this.fillEmail(data.email)
    await this.fillFirstName(data.first_name)
    await this.fillLastName(data.last_name)
    if (data.phone) await this.fillPhone(data.phone)
    if (data.municipality_role) await this.selectRole(data.municipality_role)
  }
}
