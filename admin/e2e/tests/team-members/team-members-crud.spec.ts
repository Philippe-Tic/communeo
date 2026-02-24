import { test, expect } from '@playwright/test'
import { TeamMemberFormPage } from '../../pages/team-member-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const api = new ApiClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testFilesDir = path.resolve(__dirname, '../../fixtures/test-files')

test.describe('Team Members CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/team-members')
  })

  test('should display team members list', async ({ page }) => {
    await page.goto('/team-members')
    await expect(page.getByRole('heading', { name: 'Équipe' })).toBeVisible()
  })

  test('should create a new team member', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    await form.fillFirstName('Jean-Pierre')
    await form.fillLastName('Duval')
    await form.selectRole('Maire')
    await form.fillDelegation('Administration générale')
    await form.fillBio('Maire de la commune depuis 2020.')
    await form.fillDisplayOrder(1)

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/team-members')
  })

  test('should create team member with photo', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    await form.fillFirstName('Marie')
    await form.fillLastName('Lefèvre')
    await form.selectRole('Adjoint(e)')
    await form.uploadPhoto(path.join(testFilesDir, 'photo-maire.jpg'))
    // Wait for photo preview to load before submitting
    await page.waitForTimeout(1000)

    await form.submit()
    // Photo upload during submit takes longer - use extended timeout
    await expectSuccessToast(page, 'Membre créé', 15000)
  })

  test('should edit an existing team member', async ({ page }) => {
    const { data } = await api.createTeamMember({
      first_name: 'Ahmed',
      last_name: 'Benali',
      role: 'adjoint',
      delegation: 'Travaux',
    })

    await page.goto(`/team-members/${data.documentId}/edit`)
    await page.waitForLoadState('networkidle')
    const form = new TeamMemberFormPage(page)
    // Re-select role since the select may not auto-populate from API value
    await form.selectRole('Adjoint(e)')
    await form.fillDelegation('Travaux et voirie')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should view team member detail', async ({ page }) => {
    const { data } = await api.createTeamMember({
      first_name: 'Sophie',
      last_name: 'Martin',
      role: 'conseiller',
    })

    await page.goto(`/team-members/${data.documentId}`)
    await expect(page.getByRole('heading', { name: /Sophie/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Martin/ })).toBeVisible()
  })

  test('should delete a team member', async ({ page }) => {
    const { data } = await api.createTeamMember({
      first_name: 'Temp',
      last_name: 'Member',
      role: 'agent',
    })

    await page.goto(`/team-members/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'supprimé')
  })

  test('should list all team member roles', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    // Open role select to verify options
    const roleCombobox = page.getByRole('combobox').first()
    await roleCombobox.click()

    await expect(page.getByRole('option', { name: 'Maire' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Adjoint(e)' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Conseiller(e)' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'DGS' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Agent' })).toBeVisible()

    // Close dropdown
    await page.keyboard.press('Escape')
  })
})
