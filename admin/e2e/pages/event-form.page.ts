import { type Page } from '@playwright/test'
import { TiptapHelper } from '../helpers/tiptap'
import { selectOption, toggleCheckbox, expectSuccessToast } from '../helpers/form-helpers'

export class EventFormPage {
  readonly editor: TiptapHelper

  constructor(private page: Page) {
    this.editor = new TiptapHelper(page)
  }

  async goto() {
    await this.page.goto('/events/new')
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/events/${id}/edit`)
  }

  async fillTitle(title: string) {
    await this.page.getByPlaceholder("Titre de l'événement").fill(title)
  }

  async fillDescription(html: string) {
    await this.editor.setHtmlContent(html)
  }

  async selectCategory(label: string) {
    await selectOption(this.page, 'Catégorie', label)
  }

  async fillStartDate(datetime: string) {
    const input = this.page.locator('input[type="datetime-local"]').first()
    await input.fill(datetime)
  }

  async fillEndDate(datetime: string) {
    const input = this.page.locator('input[type="datetime-local"]').nth(1)
    await input.fill(datetime)
  }

  async fillLocation(location: string) {
    await this.page.getByPlaceholder('Nom du lieu').fill(location)
  }

  async fillAddress(address: string) {
    await this.page.getByPlaceholder('Adresse complète du lieu').fill(address)
  }

  async fillPrice(price: string) {
    await this.page.getByPlaceholder(/Gratuit/).fill(price)
  }

  async fillOrganizer(organizer: string) {
    await this.page.getByPlaceholder("Nom de l'organisateur").fill(organizer)
  }

  async fillContactEmail(email: string) {
    await this.page.getByPlaceholder('contact@example.com').fill(email)
  }

  async fillContactPhone(phone: string) {
    await this.page.getByPlaceholder('01 23 45 67 89').first().fill(phone)
  }

  async toggleRegistrationRequired() {
    await toggleCheckbox(this.page, 'Inscription requise')
  }

  async fillMaxParticipants(max: number) {
    await this.page.getByPlaceholder('50').fill(String(max))
  }

  async toggleFeatured() {
    await toggleCheckbox(this.page, 'Événement à la une')
  }

  async submit() {
    await this.page.getByRole('button', { name: /^(Créer|Mettre à jour)$/ }).click()
  }

  async expectCreatedToast() {
    await expectSuccessToast(this.page, 'Événement créé')
  }

  async expectUpdatedToast() {
    await expectSuccessToast(this.page, 'Événement mis à jour')
  }

  async fillFullEvent(data: {
    title: string
    description?: string
    start_date: string
    end_date?: string
    location?: string
    address?: string
    category?: string
    organizer?: string
    contact_email?: string
    contact_phone?: string
    registration_required?: boolean
    max_participants?: number
    featured?: boolean
    price?: string
  }) {
    await this.fillTitle(data.title)
    if (data.description) await this.fillDescription(data.description)
    if (data.category) await this.selectCategory(data.category)
    await this.fillStartDate(data.start_date)
    if (data.end_date) await this.fillEndDate(data.end_date)
    if (data.location) await this.fillLocation(data.location)
    if (data.address) await this.fillAddress(data.address)
    if (data.price) await this.fillPrice(data.price)
    if (data.organizer) await this.fillOrganizer(data.organizer)
    if (data.contact_email) await this.fillContactEmail(data.contact_email)
    if (data.contact_phone) await this.fillContactPhone(data.contact_phone)
    if (data.registration_required) await this.toggleRegistrationRequired()
    if (data.max_participants) await this.fillMaxParticipants(data.max_participants)
    if (data.featured) await this.toggleFeatured()
  }
}
