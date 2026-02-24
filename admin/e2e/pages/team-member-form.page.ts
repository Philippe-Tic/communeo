import { type Page } from '@playwright/test'
import { selectOption, expectSuccessToast, uploadFile } from '../helpers/form-helpers'

export class TeamMemberFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/team-members/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/team-members/${id}/edit`)
  }

  async fillFirstName(name: string) {
    await this.page.getByPlaceholder('Prénom').fill(name)
  }

  async fillLastName(name: string) {
    await this.page.getByPlaceholder('Nom', { exact: true }).fill(name)
  }

  async selectRole(label: string) {
    await selectOption(this.page, 'Rôle', label)
  }

  async fillDelegation(delegation: string) {
    await this.page.getByPlaceholder('Ex: Urbanisme et travaux').fill(delegation)
  }

  async fillBio(bio: string) {
    await this.page.getByPlaceholder('Biographie du membre...').fill(bio)
  }

  async fillDisplayOrder(order: number) {
    await this.page.locator('input[type="number"]').fill(String(order))
  }

  async uploadPhoto(filePath: string) {
    await uploadFile(this.page, filePath, 'input[type="file"]')
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Membre créé')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Membre mis à jour')
  }

  async fillFullMember(data: {
    first_name: string
    last_name: string
    role?: string
    delegation?: string
    bio?: string
    display_order?: number
  }) {
    await this.fillFirstName(data.first_name)
    await this.fillLastName(data.last_name)
    if (data.role) await this.selectRole(data.role)
    if (data.delegation) await this.fillDelegation(data.delegation)
    if (data.bio) await this.fillBio(data.bio)
    if (data.display_order !== undefined) await this.fillDisplayOrder(data.display_order)
  }
}
