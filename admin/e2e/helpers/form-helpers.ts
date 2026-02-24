import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Select an option in a Radix Select component (rendered in a portal).
 * The trigger has role="combobox" and options have role="option".
 */
export async function selectOption(page: Page, label: string, optionText: string) {
  // Find the select trigger near the label
  const fieldContainer = page.locator('div').filter({ hasText: new RegExp(`^${label}`) }).last()
  await fieldContainer.getByRole('combobox').click()
  // Options are rendered in a portal — find by role
  await page.getByRole('option', { name: optionText }).click()
}

/**
 * Select by clicking the combobox within a specific form section.
 * More precise when multiple selects exist.
 */
export async function selectOptionByIndex(page: Page, index: number, optionText: string) {
  const triggers = page.getByRole('combobox')
  await triggers.nth(index).click()
  await page.getByRole('option', { name: optionText }).click()
}

/**
 * Toggle a FormCheckbox (implemented as Switch) by its label text.
 * Finds the container that has both the label and the switch, then clicks the switch.
 */
export async function toggleCheckbox(page: Page, labelText: string) {
  const container = page.locator('div')
    .filter({ has: page.locator('label', { hasText: labelText }) })
    .filter({ has: page.getByRole('switch') })
  await container.getByRole('switch').first().click()
}

/**
 * Wait for a toast notification with specific text (Sonner).
 */
export async function expectToast(page: Page, text: string, timeout = 10000) {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text })
  await expect(toast).toBeVisible({ timeout })
}

/**
 * Wait for a success toast.
 */
export async function expectSuccessToast(page: Page, text: string, timeout = 10000) {
  await expectToast(page, text, timeout)
}

/**
 * Confirm an alert dialog (ConfirmDialog component).
 * Default confirm button text is "Confirmer".
 */
export async function confirmDialog(page: Page, confirmText = 'Supprimer') {
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible({ timeout: 10000 })
  await dialog.getByRole('button', { name: confirmText }).click()
}

/**
 * Handle native browser confirm dialog (window.confirm).
 * Must be called BEFORE the action that triggers the dialog.
 * Returns a promise that resolves when the dialog is handled.
 */
export function acceptNativeConfirm(page: Page) {
  page.once('dialog', (dialog) => dialog.accept())
}

/**
 * Cancel an alert dialog.
 */
export async function cancelDialog(page: Page, cancelText = 'Annuler') {
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: cancelText }).click()
}

/**
 * Upload a file to an input[type="file"] element.
 * Handles hidden file inputs.
 */
export async function uploadFile(page: Page, filePath: string, selector = 'input[type="file"]') {
  const fileInput = page.locator(selector).first()
  await fileInput.setInputFiles(filePath)
}

/**
 * Fill a FormField by its label text.
 */
export async function fillField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: false })
  await field.fill(value)
}

/**
 * Fill an input field by its placeholder text.
 */
export async function fillByPlaceholder(page: Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).fill(value)
}

/**
 * Click a button by its text.
 */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click()
}

/**
 * Wait for navigation to complete after an action.
 */
export async function waitForNavigation(page: Page, url: string | RegExp) {
  await page.waitForURL(url, { timeout: 15000 })
}

/**
 * Fill a datetime-local input.
 */
export async function fillDatetime(page: Page, label: string, datetime: string) {
  const container = page.locator('div').filter({ hasText: new RegExp(`^${label}`) }).last()
  await container.locator('input[type="datetime-local"]').fill(datetime)
}

/**
 * Fill a date input.
 */
export async function fillDate(page: Page, label: string, date: string) {
  const container = page.locator('div').filter({ hasText: new RegExp(`^${label}`) }).last()
  await container.locator('input[type="date"]').fill(date)
}

/**
 * Get row count in a table or list.
 */
export async function getListItemCount(page: Page): Promise<number> {
  // Wait briefly for data to load
  await page.waitForTimeout(1000)
  // Try table rows first, then card-based lists
  const tableRows = page.locator('tbody tr')
  const count = await tableRows.count()
  if (count > 0) return count
  // Fallback to card/link items
  return page.locator('[data-testid="list-item"], a[href*="/"]').count()
}
