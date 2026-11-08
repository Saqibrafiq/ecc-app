import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa']
const scan = (page: Page) => new AxeBuilder({ page }).withTags(TAGS).analyze()

test.describe("the Board's squads", () => {
  test('reaches the Board and sees the squad waiting for approval first', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Board' })
      .click()

    await expect(page.getByRole('heading', { level: 1, name: 'Squads' })).toBeVisible()
    await expect(page.getByRole('listitem').first()).toContainText('Waiting for your approval')
    await expect(page).toHaveTitle('Board')
  })

  test('extends the deadline and approves the squad', async ({ page }) => {
    await page.goto('/board/squad/201')

    await page.getByRole('button', { name: 'Thursday' }).click()
    await expect(page.getByRole('status')).toHaveText('Deadline changed.')

    await page.getByRole('button', { name: 'Approve and announce' }).click()
    await expect(page.getByRole('status')).toHaveText('Approved and announced.')
    await expect(page.getByRole('button', { name: 'Reopen for the captain' })).toBeVisible()
  })

  test('sends the squad back to the captain with a note', async ({ page }) => {
    await page.goto('/board/squad/201')

    await page.getByRole('button', { name: 'Send back to the captain' }).click()
    const sheet = page.getByRole('dialog', { name: 'Send back' })
    await sheet.getByLabel('Note to the captain').fill('Pick a wicket-keeper')
    await sheet.getByRole('button', { name: 'Send back' }).click()

    await expect(page.getByRole('status')).toHaveText('Sent back to the captain.')
    await expect(page.getByText('Your note: Pick a wicket-keeper')).toBeVisible()
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de/board')

    await expect(page.getByRole('heading', { level: 1, name: 'Kader' })).toBeVisible()
  })

  test('has no accessibility violations on the Board screens', async ({ page }) => {
    for (const path of ['/board', '/board/squad/201', '/board/squad/9']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect((await scan(page)).violations, path).toEqual([])
    }

    await page.goto('/board/squad/201')
    await page.getByRole('button', { name: 'Send back to the captain' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // The page behind the open sheet is dimmed and hidden from assistive technology (modal).
    const sheetScan = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(TAGS)
      .analyze()
    expect(sheetScan.violations).toEqual([])
  })
})
