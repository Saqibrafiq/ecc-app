import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa']
const scan = (page: Page) => new AxeBuilder({ page }).withTags(TAGS).analyze()

test.describe('your attendance', () => {
  test('shows the standing, the targets and every practice of the season', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Attendance' })
      .click()

    await expect(page.getByRole('heading', { level: 1, name: 'Your attendance' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Selection' })).toBeVisible()
    await expect(page.getByRole('meter', { name: 'Away matches' })).toBeVisible()
    await expect(page.getByText('Correction requested')).toBeVisible()
    await expect(page).toHaveTitle('Your attendance')
  })

  test('asks the captain to correct a missed practice', async ({ page }) => {
    await page.goto('/attendance')

    await page
      .getByRole('button', { name: /^I was there on/ })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'I was there' })
    await sheet.getByLabel('What happened?').fill('Came after the check-in')
    await sheet.getByRole('button', { name: 'Ask for correction' }).click()

    await expect(page.getByRole('status')).toHaveText('Your captain has been asked to correct it.')
  })

  test("lets the captain accept a player's request", async ({ page }) => {
    await page.goto('/team')
    const requests = page.getByRole('region', { name: 'Attendance corrections' })

    await requests.getByRole('button', { name: 'Accept Lukas Braun’s request' }).click()

    await expect(requests.getByRole('status')).toHaveText('All requests decided.')
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de/attendance')

    await expect(page.getByRole('heading', { level: 1, name: 'Deine Anwesenheit' })).toBeVisible()
  })

  test('has no accessibility violations, also with the request sheet open', async ({ page }) => {
    await page.goto('/attendance')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect((await scan(page)).violations).toEqual([])

    await page
      .getByRole('button', { name: /^I was there on/ })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // The page behind the open sheet is dimmed and hidden from assistive technology (modal).
    const sheetScan = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(TAGS)
      .analyze()
    expect(sheetScan.violations).toEqual([])
  })
})
