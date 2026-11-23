import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa']

/** The fold fades match days in; axe would measure the contrast of half-faded text. */
async function waitForFold(page: Page) {
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll('#season-timeline section, #season-timeline section > ol > li'),
    ].every((element) => getComputedStyle(element).opacity === '1'),
  )
}

test.describe('the season schedule', () => {
  test('opens from the week on the next match day, and the matches still to come', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Schedule' })
      .getByRole('link', { name: 'Season' })
      .click()

    await expect(page.getByRole('heading', { level: 1, name: 'Season schedule' })).toBeVisible()
    await expect(page).toHaveTitle('Season schedule')
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Week' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      page.getByText('ECC I: 4 played · 3 won · 1 lost · 2 matches to come'),
    ).toBeVisible()

    const next = page.getByRole('heading', { level: 3, name: /Next$/ })
    await expect(next).toBeInViewport()
    await expect(page.getByText('vs Nürnberg CC')).toBeVisible()
    await expect(page.getByText('Won by 6 wickets')).toHaveCount(0)
  })

  test('unfolds the season so far, results and all', async ({ page }) => {
    await page.goto('/season')

    await page.getByRole('button', { name: 'Show 10 earlier matches' }).click()

    await expect(page.getByText('Won by 6 wickets')).toBeVisible()
    await expect(page.getByText('Abandoned')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hide earlier matches' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  test('returns to the week', async ({ page }) => {
    await page.goto('/season')
    await page
      .getByRole('navigation', { name: 'Schedule' })
      .getByRole('link', { name: 'This week' })
      .click()

    await expect(page.getByRole('heading', { level: 1, name: /Hi Saqib/i })).toBeVisible()
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de/season')

    await expect(page.getByRole('heading', { level: 1, name: 'Saisonplan' })).toBeVisible()
  })

  test('has no accessibility violations, folded or unfolded', async ({ page }) => {
    await page.goto('/season')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([])

    await page.getByRole('button', { name: /earlier matches/ }).click()
    await expect(page.getByText('Abandoned')).toBeVisible()
    await waitForFold(page)
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([])
  })
})
