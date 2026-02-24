import { test, expect } from '@playwright/test'
import { ArticleFormPage } from '../../pages/article-form.page'
import { ApiClient } from '../../helpers/api-client'
import { acceptNativeConfirm, expectSuccessToast } from '../../helpers/form-helpers'

const api = new ApiClient()

test.describe('Articles CRUD', () => {
  test.beforeAll(async () => {
    await api.login()
  })

  test.beforeEach(async () => {
    await api.deleteAll('/api/articles')
  })

  test('should display empty articles list', async ({ page }) => {
    await page.goto('/articles')
    await expect(page.getByText('Aucun article trouvé')).toBeVisible()
  })

  test('should create a new article', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    await form.fillTitle('Test Article E2E')
    await form.fillContent('<p>Contenu de test pour article E2E.</p>')
    await form.fillSummary('Résumé de test')
    await form.selectCategory('Actualité')
    await form.selectStatus('Publié')
    await form.fillAuthor('Auteur Test')
    await form.fillMetaDescription('Description SEO de test')

    await form.submit()
    await form.expectCreatedToast()
    await page.waitForURL('**/articles')
  })

  test('should display article in list after creation', async ({ page }) => {
    await api.createArticle({
      title: 'Article visible',
      slug: 'article-visible',
      content: '<p>Contenu</p>',
      status: 'published',
      category: 'news',
    })

    await page.goto('/articles')
    await expect(page.getByText('Article visible')).toBeVisible()
  })

  test('should view article detail', async ({ page }) => {
    const { data } = await api.createArticle({
      title: 'Article à consulter',
      slug: 'article-a-consulter',
      content: '<p>Contenu détaillé</p>',
      status: 'published',
      category: 'news',
    })

    await page.goto(`/articles/${data.documentId}`)
    await expect(page.getByRole('heading', { name: 'Article à consulter' })).toBeVisible()
  })

  test('should edit an existing article', async ({ page }) => {
    const { data } = await api.createArticle({
      title: 'Article à modifier',
      slug: 'article-a-modifier',
      content: '<p>Ancien contenu</p>',
      status: 'draft',
      category: 'news',
    })

    await page.goto(`/articles/${data.documentId}/edit`)
    const form = new ArticleFormPage(page)
    await form.fillTitle('Article modifié')
    await form.submit()
    await form.expectUpdatedToast()
  })

  test('should delete an article', async ({ page }) => {
    const { data } = await api.createArticle({
      title: 'Article à supprimer',
      slug: 'article-a-supprimer',
      content: '<p>Contenu</p>',
      status: 'draft',
      category: 'news',
    })

    await page.goto(`/articles/${data.documentId}`)
    acceptNativeConfirm(page)
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expectSuccessToast(page, 'Article supprimé')
  })

  test('should toggle featured status', async ({ page }) => {
    const { data } = await api.createArticle({
      title: 'Article une',
      slug: 'article-une',
      content: '<p>Contenu</p>',
      status: 'published',
      category: 'news',
      featured: false,
    })

    await page.goto(`/articles/${data.documentId}`)
    await page.getByRole('button', { name: 'Mettre à la une' }).click()
    await expectSuccessToast(page, 'mis à la une')
  })

  test('should create article as draft', async ({ page }) => {
    const form = new ArticleFormPage(page)
    await form.goto()

    await form.fillTitle('Brouillon test')
    await form.fillContent('<p>Contenu brouillon</p>')
    // Status defaults to 'draft'
    await form.submit()
    await form.expectCreatedToast()
  })

  test('should filter articles by status', async ({ page }) => {
    await api.createArticle({
      title: 'Article publié filtre',
      slug: 'article-publie-filtre',
      content: '<p>Contenu</p>',
      status: 'published',
      category: 'news',
    })
    await api.createArticle({
      title: 'Brouillon filtre',
      slug: 'brouillon-filtre',
      content: '<p>Contenu</p>',
      status: 'draft',
      category: 'news',
    })

    await page.goto('/articles')
    // Both should be visible initially
    await expect(page.getByText('Article publié filtre')).toBeVisible()
    await expect(page.getByText('Brouillon filtre')).toBeVisible()
  })
})
