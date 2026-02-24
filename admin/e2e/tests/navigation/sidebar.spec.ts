import { test, expect } from '@playwright/test'
import { SidebarPage } from '../../pages/sidebar.page'

test.describe('Sidebar Navigation', () => {
  let sidebar: SidebarPage

  test.beforeEach(async ({ page }) => {
    sidebar = new SidebarPage(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should display sidebar with all navigation groups', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Articles' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Pages' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Événements' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Documents' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Alertes' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Médiathèque' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Messages' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Équipe' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Associations' }).first()).toBeVisible()
  })

  test('should navigate to Articles page', async ({ page }) => {
    await sidebar.navigateToArticles()
    await expect(page).toHaveURL(/\/articles/)
  })

  test('should navigate to Pages page', async ({ page }) => {
    await sidebar.navigateToPages()
    await expect(page).toHaveURL(/\/pages/)
  })

  test('should navigate to Events page', async ({ page }) => {
    await sidebar.navigateToEvents()
    await expect(page).toHaveURL(/\/events/)
  })

  test('should navigate to Messages page', async ({ page }) => {
    await sidebar.navigateToMessages()
    await expect(page).toHaveURL(/\/messages/)
  })

  test('should navigate to Team Members page', async ({ page }) => {
    await sidebar.navigateToTeamMembers()
    await expect(page).toHaveURL(/\/team-members/)
  })

  test('should navigate to Associations page', async ({ page }) => {
    await sidebar.navigateToAssociations()
    await expect(page).toHaveURL(/\/associations/)
  })

  test('should navigate to Site Config page', async ({ page }) => {
    await sidebar.navigateToSiteConfig()
    await expect(page).toHaveURL(/\/site/)
  })

  test('should navigate to Users page', async ({ page }) => {
    await sidebar.navigateToUsers()
    await expect(page).toHaveURL(/\/users/)
  })

  test('should navigate back to Dashboard', async ({ page }) => {
    await sidebar.navigateToArticles()
    await page.waitForURL('**/articles')
    await sidebar.navigateToDashboard()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
