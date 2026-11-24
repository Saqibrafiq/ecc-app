import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa']
/** The preview's announced squad: the sample ECC I match. */
const SHEET = '/squad/201'

/** Rows fade in; axe would measure the contrast of half-faded text. */
async function waitForRows(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('main li')].every(
      (element) => getComputedStyle(element).opacity === '1',
    ),
  )
}

test.describe('the announced squad', () => {
  test("shows the team sheet with the member's own row picked out", async ({ page }) => {
    await page.goto(SHEET)

    await expect(page).toHaveTitle('Team sheet')
    await expect(page.getByRole('heading', { level: 1, name: /^vs / })).toBeVisible()
    await expect(page.getByText("You're in the XI.")).toBeVisible()

    const xi = page.getByRole('region', { name: 'Playing XI' }).getByRole('listitem')
    await expect(xi).toHaveCount(11)
    await expect(xi.filter({ hasText: 'You' })).toHaveCount(1)
    await expect(page.getByRole('region', { name: '12th man' }).getByRole('listitem')).toHaveCount(
      1,
    )
    await expect(page.getByRole('region', { name: 'Reserves' }).getByRole('listitem')).toHaveCount(
      1,
    )

    await page.getByRole('link', { name: 'Week' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('explains a match that does not exist, and speaks German under /de', async ({ page }) => {
    await page.goto('/squad/999')
    await expect(page.getByRole('heading', { level: 1, name: 'Match not found' })).toBeVisible()

    await page.goto(`/de${SHEET}`)
    await expect(page.getByText('Du stehst in der XI.')).toBeVisible()
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(SHEET)
    await waitForRows(page)

    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})
