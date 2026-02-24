import { type Page } from '@playwright/test'
import { TiptapHelper } from '../helpers/tiptap'
import { selectOption, toggleCheckbox, expectSuccessToast } from '../helpers/form-helpers'

export class ArticleFormPage {
  readonly editor: TiptapHelper

  constructor(private page: Page) {
    this.editor = new TiptapHelper(page)
  }

  async goto() {
    await this.page.goto('/articles/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/articles/${id}/edit`)
  }

  async fillTitle(title: string) {
    await this.page.getByPlaceholder("Titre de l'article").fill(title)
  }

  async fillSlug(slug: string) {
    await this.page.getByPlaceholder("slug-de-l-article").fill(slug)
  }

  async fillSummary(summary: string) {
    await this.page.getByPlaceholder("Résumé de l'article").fill(summary)
  }

  async fillContent(html: string) {
    await this.editor.setHtmlContent(html)
  }

  async typeContent(text: string) {
    await this.editor.focus()
    await this.editor.typeText(text)
  }

  async selectCategory(label: string) {
    await selectOption(this.page, 'Catégorie', label)
  }

  async selectStatus(label: string) {
    await selectOption(this.page, 'Statut', label)
  }

  async fillAuthor(author: string) {
    await this.page.getByPlaceholder("Nom de l'auteur").fill(author)
  }

  async toggleFeatured() {
    await toggleCheckbox(this.page, 'Article à la une')
  }

  async fillMetaDescription(desc: string) {
    await this.page.getByPlaceholder('Description pour les moteurs de recherche').fill(desc)
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Article créé')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Article mis à jour')
  }

  async fillFullArticle(data: {
    title: string
    content: string
    summary?: string
    category?: string
    status?: string
    author?: string
    featured?: boolean
    meta_description?: string
  }) {
    await this.fillTitle(data.title)
    if (data.content) await this.fillContent(data.content)
    if (data.summary) await this.fillSummary(data.summary)
    if (data.category) await this.selectCategory(data.category)
    if (data.status) await this.selectStatus(data.status)
    if (data.author) await this.fillAuthor(data.author)
    if (data.featured) await this.toggleFeatured()
    if (data.meta_description) await this.fillMetaDescription(data.meta_description)
  }
}
