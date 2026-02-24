import { test, expect } from '@playwright/test'
import { ArticleFormPage } from '../../pages/article-form.page'
import { PageFormPage } from '../../pages/page-form.page'
import { EventFormPage } from '../../pages/event-form.page'
import { TeamMemberFormPage } from '../../pages/team-member-form.page'
import { AssociationFormPage } from '../../pages/association-form.page'
import { AlerteFormPage } from '../../pages/alerte-form.page'
import { OfficialDocumentFormPage } from '../../pages/official-document-form.page'
import { SiteConfigPage } from '../../pages/site-config.page'
import { ApiClient } from '../../helpers/api-client'
import {
  siteConfig,
  pages as testPages,
  articles,
  events,
  teamMembers,
  associations,
  alertes,
  officialDocuments,
} from '../../fixtures/test-data'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testFilesDir = path.resolve(__dirname, '../../fixtures/test-files')
const api = new ApiClient()

/**
 * Suite séquentielle : création d'un site complet pour Saint-Martin-les-Bains.
 * Chaque test dépend du précédent.
 */
test.describe.serial('Complete Site Creation - Saint-Martin-les-Bains', () => {
  test.beforeAll(async () => {
    await api.login()
    // Clean all existing data
    await api.cleanupAll()
  })

  // ── Site Configuration ─────────────────────────────────────────────────

  test('should configure site general information', async ({ page }) => {
    const config = new SiteConfigPage(page)
    await config.gotoEdit()

    await config.fillContactEmail(siteConfig.contact_mail)
    await config.fillContactPhone(siteConfig.contact_phone)
    await config.fillAddress(siteConfig.address)

    await config.submit()
    await config.expectUpdatedToast()
  })

  // ── Pages ──────────────────────────────────────────────────────────────

  test('should create page: Accueil', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    const data = testPages[0]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.selectTemplate('Par défaut')
    await form.fillMenuOrder(data.menu_order)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create page: Votre Mairie', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    const data = testPages[1]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.selectTemplate('À propos')
    await form.fillMenuOrder(data.menu_order)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create page: Services municipaux', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    const data = testPages[2]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.selectTemplate('Services')
    await form.fillMenuOrder(data.menu_order)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create page: Urbanisme (child of Services)', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()
    await page.waitForLoadState('networkidle')

    const data = testPages[3]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.selectParent('Services municipaux')

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create page: Vie associative', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    const data = testPages[4]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.fillMenuOrder(data.menu_order)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create page: Contact', async ({ page }) => {
    const form = new PageFormPage(page)
    await form.goto()

    const data = testPages[5]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.selectStatus('Publié')
    await form.fillMenuOrder(data.menu_order)

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Articles ───────────────────────────────────────────────────────────

  test('should create article: Inauguration médiathèque (published, featured)', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    const data = articles[0]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.fillSummary(data.summary)
    await form.selectCategory('Actualité')
    await form.selectStatus('Publié')
    await form.fillAuthor(data.author)
    await form.toggleFeatured()
    await form.fillMetaDescription(data.meta_description)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create article: Travaux Place du Marché (published)', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    const data = articles[1]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.fillSummary(data.summary)
    await form.selectCategory('Information')
    await form.selectStatus('Publié')
    await form.fillAuthor(data.author)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create article: Alerte canicule (published, featured, emergency)', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    const data = articles[2]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.fillSummary(data.summary)
    await form.selectCategory('Urgence')
    await form.selectStatus('Publié')
    await form.fillAuthor(data.author)
    await form.toggleFeatured()

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create article: Compte-rendu Conseil Municipal (draft)', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    const data = articles[3]
    await form.fillTitle(data.title)
    await form.fillContent(data.content)
    await form.fillSummary(data.summary)
    await form.selectCategory('Actualité')
    // Status defaults to draft
    await form.fillAuthor(data.author)

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Événements ─────────────────────────────────────────────────────────

  test('should create event: Conseil Municipal (meeting)', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    const data = events[0]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.selectCategory('Réunion')
    await form.fillStartDate(data.start_date)
    await form.fillEndDate(data.end_date!)
    await form.fillLocation(data.location!)
    await form.fillAddress(data.address!)
    await form.fillOrganizer(data.organizer!)
    await form.fillContactEmail(data.contact_email!)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create event: Fête de la Musique (cultural, featured)', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    const data = events[1]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.selectCategory('Culturel')
    await form.fillStartDate(data.start_date)
    await form.fillEndDate(data.end_date!)
    await form.fillLocation(data.location!)
    await form.fillAddress(data.address!)
    await form.fillPrice(data.price!)
    await form.fillOrganizer(data.organizer!)
    await form.toggleFeatured()

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create event: Marché de Noël (celebration, featured)', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    const data = events[2]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.selectCategory('Célébration')
    await form.fillStartDate(data.start_date)
    await form.fillEndDate(data.end_date!)
    await form.fillLocation(data.location!)
    await form.fillPrice(data.price!)
    await form.toggleFeatured()

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create event: Tournoi de pétanque (sport, registration)', async ({ page }) => {
    const form = new EventFormPage(page)
    await form.goto()

    const data = events[3]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.selectCategory('Sport')
    await form.fillStartDate(data.start_date)
    await form.fillEndDate(data.end_date!)
    await form.fillLocation(data.location!)
    await form.fillPrice(data.price!)
    await form.fillOrganizer(data.organizer!)
    await form.fillContactEmail(data.contact_email!)
    await form.toggleRegistrationRequired()
    await form.fillMaxParticipants(data.max_participants!)

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Équipe municipale ──────────────────────────────────────────────────

  test('should create team member: Jean-Pierre Duval (Maire)', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    const data = teamMembers[0]
    await form.fillFullMember({
      ...data,
      role: 'Maire',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create team member: Marie Lefèvre (Adjointe)', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    const data = teamMembers[1]
    await form.fillFullMember({
      ...data,
      role: 'Adjoint(e)',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create team member: Ahmed Benali (Adjoint)', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    const data = teamMembers[2]
    await form.fillFullMember({
      ...data,
      role: 'Adjoint(e)',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create team member: Sophie Martin (Conseillère)', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    const data = teamMembers[3]
    await form.fillFullMember({
      ...data,
      role: 'Conseiller(e)',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create team member: Philippe Roux (DGS)', async ({ page }) => {
    const form = new TeamMemberFormPage(page)
    await form.goto()

    const data = teamMembers[4]
    await form.fillFullMember({
      ...data,
      role: 'DGS',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Associations ───────────────────────────────────────────────────────

  test('should create association: AS Saint-Martin Football', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    const data = associations[0]
    await form.fillFullAssociation({
      ...data,
      category: 'Sport',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create association: Les Amis de la Bibliothèque', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    const data = associations[1]
    await form.fillFullAssociation({
      ...data,
      category: 'Culture',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create association: Solidarité Saint-Martin', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    const data = associations[2]
    await form.fillFullAssociation({
      ...data,
      category: 'Social',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create association: Les Jardins Partagés', async ({ page }) => {
    const form = new AssociationFormPage(page)
    await form.goto()

    const data = associations[3]
    await form.fillFullAssociation({
      ...data,
      category: 'Environnement',
    })

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Documents officiels ────────────────────────────────────────────────

  test('should create document: PV Conseil Municipal', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    const data = officialDocuments[0]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.fillReferenceNumber(data.reference_number)
    await form.selectDocumentType('Procès-verbal de conseil municipal')
    await form.fillYear(data.year)
    await form.fillDocumentDate(data.document_date)
    await form.fillSessionDate(data.session_date!)
    await form.selectStatus('Publié')
    await form.uploadMainFile(path.join(testFilesDir, 'deliberation.pdf'))

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create document: Délibération Budget', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    const data = officialDocuments[1]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.fillReferenceNumber(data.reference_number)
    await form.selectDocumentType('Délibération')
    await form.fillYear(data.year)
    await form.fillDocumentDate(data.document_date)
    await form.selectStatus('Publié')
    await form.uploadMainFile(path.join(testFilesDir, 'deliberation.pdf'))

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create document: Budget Primitif (draft)', async ({ page }) => {
    const form = new OfficialDocumentFormPage(page)
    await form.goto()

    const data = officialDocuments[2]
    await form.fillTitle(data.title)
    await form.fillDescription(data.description)
    await form.fillReferenceNumber(data.reference_number)
    await form.selectDocumentType('Budget primitif')
    await form.fillYear(data.year)
    await form.fillDocumentDate(data.document_date)
    await form.uploadMainFile(path.join(testFilesDir, 'deliberation.pdf'))

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Alertes ────────────────────────────────────────────────────────────

  test('should create alerte: Coupure d\'eau (warning)', async ({ page }) => {
    const form = new AlerteFormPage(page)
    await form.goto()

    const data = alertes[0]
    await form.fillTitle(data.title)
    await form.fillMessage(data.message)
    await form.selectSeverity('Avertissement')
    await form.toggleActive()
    await form.fillDisplayFrom(data.display_from)
    await form.fillDisplayUntil(data.display_until)
    await form.fillLinkUrl(data.link_url)
    await form.fillLinkLabel(data.link_label)

    await form.submit()
    await form.expectCreatedToast()
  })

  test('should create alerte: Inscriptions périscolaires (info)', async ({ page }) => {
    const form = new AlerteFormPage(page)
    await form.goto()

    const data = alertes[1]
    await form.fillTitle(data.title)
    await form.fillMessage(data.message)
    await form.selectSeverity('Information')
    await form.toggleActive()
    await form.fillDisplayFrom(data.display_from)
    await form.fillDisplayUntil(data.display_until)

    await form.submit()
    await form.expectCreatedToast()
  })

  // ── Vérifications finales ──────────────────────────────────────────────

  test('should verify all pages are listed', async ({ page }) => {
    await page.goto('/pages')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Accueil')).toBeVisible()
    await expect(page.getByText('Votre Mairie')).toBeVisible()
    await expect(page.getByText('Services municipaux')).toBeVisible()
    await expect(page.getByText('Contact')).toBeVisible()
  })

  test('should verify all articles are listed', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Inauguration de la nouvelle médiathèque')).toBeVisible()
    await expect(page.getByText('Travaux rue de la Place du Marché')).toBeVisible()
    await expect(page.getByText('Alerte canicule')).toBeVisible()
  })

  test('should verify all events are listed', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Conseil Municipal')).toBeVisible()
    await expect(page.getByText('Fête de la Musique')).toBeVisible()
    await expect(page.getByText('Marché de Noël')).toBeVisible()
    await expect(page.getByText('Tournoi de pétanque')).toBeVisible()
  })

  test('should verify all team members are listed', async ({ page }) => {
    await page.goto('/team-members')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Jean-Pierre')).toBeVisible()
    await expect(page.getByText('Marie')).toBeVisible()
    await expect(page.getByText('Ahmed')).toBeVisible()
    await expect(page.getByText('Sophie')).toBeVisible()
    await expect(page.getByText('Philippe')).toBeVisible()
  })

  test('should verify all associations are listed', async ({ page }) => {
    await page.goto('/associations')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('AS Saint-Martin Football')).toBeVisible()
    await expect(page.getByText('Les Amis de la Bibliothèque')).toBeVisible()
    await expect(page.getByText('Solidarité Saint-Martin')).toBeVisible()
    await expect(page.getByText('Les Jardins Partagés')).toBeVisible()
  })

  test('should verify dashboard shows statistics', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Tableau de bord')).toBeVisible()
  })
})
