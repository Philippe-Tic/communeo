import { expect, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('votre@email.com').fill(email)
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder('Votre mot de passe').fill(password)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Se connecter' }).click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectError(text?: string) {
    if (text) {
      await expect(this.page.getByText(text)).toBeVisible()
    } else {
      await expect(this.page.locator('.text-destructive').first()).toBeVisible()
    }
  }

  async expectOnDashboard() {
    await this.page.waitForURL('**/dashboard', { timeout: 15000 })
    await expect(this.page.getByText('Bienvenue')).toBeVisible()
  }

  get forgotPasswordLink() {
    return this.page.getByText('Mot de passe oublié ?')
  }
}
