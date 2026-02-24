import { type Page } from '@playwright/test'
import { TiptapHelper } from '../helpers/tiptap'
import { selectOption, expectSuccessToast } from '../helpers/form-helpers'

export class PageFormPage {
  readonly editor: TiptapHelper

  constructor(private page: Page) {
    this.editor = new TiptapHelper(page)
  }

  async goto() {
    await this.page.goto('/pages/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/pages/${id}/edit`)
  }

  async fillTitle(title: string) {
    await this.page.getByPlaceholder('Titre de la page').fill(title)
  }

  async fillSlug(slug: string) {
    await this.page.getByPlaceholder('slug-de-la-page').fill(slug)
  }

  async fillContent(html: string) {
    await this.editor.setHtmlContent(html)
  }

  async selectStatus(label: string) {
    await selectOption(this.page, 'Statut', label)
  }

  async selectParent(label: string) {
    await selectOption(this.page, 'Page parent', label)
  }

  async selectTemplate(label: string) {
    await selectOption(this.page, 'Template', label)
  }

  async fillMenuOrder(order: number) {
    await this.page.getByLabel('Ordre dans le menu').fill(String(order))
  }

  async fillSeoTitle(title: string) {
    await this.page.getByPlaceholder('Titre pour les moteurs de recherche').fill(title)
  }

  async fillMetaDescription(desc: string) {
    await this.page.getByPlaceholder('Description pour les moteurs de recherche').fill(desc)
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Page créée')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Page mise à jour')
  }

  async fillFullPage(data: {
    title: string
    content: string
    status?: string
    template?: string
    parentTitle?: string
    menu_order?: number
  }) {
    await this.fillTitle(data.title)
    if (data.content) await this.fillContent(data.content)
    if (data.status) await this.selectStatus(data.status)
    if (data.template) await this.selectTemplate(data.template)
    if (data.parentTitle) await this.selectParent(data.parentTitle)
    if (data.menu_order !== undefined) await this.fillMenuOrder(data.menu_order)
  }
}
