import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()

test.describe("the captain's team", () => {
  test('reaches the team from the week and shows what is due', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Team' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Your team' })).toBeVisible()
    await expect(page.getByText('Check-in due')).toBeVisible()
    await expect(page.getByText('Not selected yet')).toBeVisible()
    await expect(page).toHaveTitle('Your team')
  })

  test('checks in who came to practice', async ({ page }) => {
    await page.goto('/team')
    await page.getByRole('link', { name: 'Check in' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'ECC I practice' })).toBeVisible()
    await page.getByText('Danish Ali').click()
    await expect(page.getByText('15 present')).toBeVisible()
    await page.getByRole('button', { name: 'Save check-in' }).click()

    await expect(page.getByRole('status')).toHaveText(/Attendance saved/)
  })

  test('picks the XI, then the 12th man, and submits the squad', async ({ page }) => {
    await page.goto('/team/squad/201')
    const free = page.locator('main ul button[aria-pressed="false"]:not([disabled])')

    for (let index = 0; index < 10; index += 1) await free.first().click()
    const sheet = page.getByRole('dialog', { name: '11 selected' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Waqas Ahmed' }).click()

    await expect(sheet).toBeHidden()
    await expect(page.getByRole('button', { name: /Waqas Ahmed/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Submit for approval' }).click()

    await expect(page.getByRole('status')).toHaveText('Sent to the Board for approval.')
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de/team')

    await expect(page.getByRole('heading', { level: 1, name: 'Dein Team' })).toBeVisible()
  })

  test('has no accessibility violations on the team screens', async ({ page }) => {
    for (const path of ['/team', '/team/check-in/101', '/team/squad/201', '/team/squad/9']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect((await scan(page)).violations, path).toEqual([])
    }

    await page.goto('/team/squad/201')
    const free = page.locator('main ul button[aria-pressed="false"]:not([disabled])')
    for (let index = 0; index < 10; index += 1) await free.first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect((await scan(page)).violations).toEqual([])
  })
})
