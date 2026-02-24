import { expect, type Locator, type Page } from '@playwright/test'

export class SidebarPage {
  constructor(private page: Page) {}

  /**
   * Get sidebar button by its text label.
   * Sidebar buttons contain an icon + a span with the name.
   */
  private button(name: string): Locator {
    // All sidebar items are buttons with a span containing the name
    return this.page.locator('button', { hasText: name }).filter({ hasText: name }).first()
  }

  async navigateTo(label: string) {
    await this.button(label).click()
  }

  async navigateToDashboard() {
    await this.button('Tableau de bord').click()
  }

  async navigateToArticles() {
    await this.navigateTo('Articles')
  }

  async navigateToPages() {
    await this.navigateTo('Pages')
  }

  async navigateToEvents() {
    await this.navigateTo('Événements')
  }

  async navigateToDocuments() {
    await this.navigateTo('Documents')
  }

  async navigateToAlertes() {
    await this.navigateTo('Alertes')
  }

  async navigateToMedia() {
    await this.navigateTo('Médiathèque')
  }

  async navigateToMessages() {
    await this.navigateTo('Messages')
  }

  async navigateToTeamMembers() {
    await this.navigateTo('Équipe')
  }

  async navigateToAssociations() {
    await this.navigateTo('Associations')
  }

  async navigateToSiteConfig() {
    await this.navigateTo('Site')
  }

  async navigateToUsers() {
    await this.navigateTo('Utilisateurs')
  }

  async navigateToDeployment() {
    await this.navigateTo('Déploiement')
  }

  async expectVisible() {
    await expect(this.button('Tableau de bord')).toBeVisible()
  }
}
