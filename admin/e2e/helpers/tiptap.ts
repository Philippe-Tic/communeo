import type { Locator, Page } from '@playwright/test'

/**
 * Helper for interacting with TipTap/ProseMirror rich text editors.
 * The editor uses a contenteditable .ProseMirror div.
 * Toolbar buttons have French title attributes.
 */
export class TiptapHelper {
  private readonly editor: Locator
  private readonly toolbar: Locator

  constructor(
    private page: Page,
    /** Container locator — defaults to first editor on page */
    container?: Locator,
  ) {
    const root = container || page.locator('.ProseMirror').first().locator('..')
    this.editor = root.locator('.ProseMirror')
    this.toolbar = root.locator('..').locator('div').first()
  }

  /** Focus the editor */
  async focus() {
    await this.editor.click()
  }

  /** Type text into the editor (appends) */
  async typeText(text: string) {
    await this.focus()
    await this.page.keyboard.type(text)
  }

  /** Clear and type new text */
  async clearAndType(text: string) {
    await this.focus()
    await this.page.keyboard.press('Meta+A')
    await this.page.keyboard.press('Backspace')
    await this.page.keyboard.type(text)
  }

  /** Set HTML content directly via evaluate */
  async setHtmlContent(html: string) {
    await this.editor.evaluate((el, content) => {
      el.innerHTML = content
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, html)
  }

  /** Click a toolbar button by its title attribute */
  async clickToolbarButton(title: string) {
    await this.page.click(`button[title="${title}"]`)
  }

  /** Apply bold formatting */
  async bold() {
    await this.clickToolbarButton('Gras')
  }

  /** Apply italic formatting */
  async italic() {
    await this.clickToolbarButton('Italique')
  }

  /** Apply underline formatting */
  async underline() {
    await this.clickToolbarButton('Souligné')
  }

  /** Insert heading level 2 */
  async heading2() {
    await this.clickToolbarButton('Titre 2')
  }

  /** Insert heading level 3 */
  async heading3() {
    await this.clickToolbarButton('Titre 3')
  }

  /** Toggle bullet list */
  async bulletList() {
    await this.clickToolbarButton('Liste à puces')
  }

  /** Toggle ordered list */
  async orderedList() {
    await this.clickToolbarButton('Liste numérotée')
  }

  /** Insert a link */
  async insertLink(url: string) {
    await this.clickToolbarButton('Lien')
    await this.page.getByPlaceholder('https://...').fill(url)
    await this.page.getByRole('button', { name: 'Confirmer' }).click()
  }

  /** Get editor HTML content */
  async getContent(): Promise<string> {
    return this.editor.innerHTML()
  }

  /** Check if editor is visible */
  async isVisible(): Promise<boolean> {
    return this.editor.isVisible()
  }

  /** Type rich content: heading + paragraphs */
  async typeRichContent(heading: string, ...paragraphs: string[]) {
    await this.focus()
    await this.heading2()
    await this.page.keyboard.type(heading)
    await this.page.keyboard.press('Enter')

    for (const para of paragraphs) {
      // Reset to normal paragraph
      await this.page.keyboard.type(para)
      await this.page.keyboard.press('Enter')
    }
  }
}
