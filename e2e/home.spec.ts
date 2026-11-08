import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('your week', () => {
  test('shows the week to answer, in English by default', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: /Hi Saqib/i })).toBeVisible()
    await expect(page.getByText(/answers needed/)).toBeVisible()
    await expect(page.getByRole('article', { name: /vs Nürnberg CC/i })).toBeVisible()
    await expect(page).toHaveTitle('Your week')
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de')

    await expect(page.getByRole('heading', { level: 1, name: /Hallo Saqib/i })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  })

  test('answers Going and Not going with a reason', async ({ page }) => {
    await page.goto('/')
    const match = page.getByRole('article', { name: /vs Nürnberg CC/i })
    const practice = page.getByRole('article', { name: /ECC I practice/i })

    await practice.getByRole('button', { name: 'Going', exact: true }).click()
    await expect(practice.getByRole('button', { name: 'Going', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await match.getByRole('button', { name: 'Not going' }).click()
    const sheet = page.getByRole('dialog', { name: 'Not going?' })
    await sheet.getByLabel('Reason').fill('Working late')
    await sheet.getByRole('button', { name: 'Save' }).click()

    await expect(sheet).toBeHidden()
    await expect(page.getByText('All answered')).toBeVisible()
  })

  test('is installable: it links a web app manifest with app icons', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()

    const response = await request.get(href ?? '')
    const manifest = (await response.json()) as { display: string; icons: { sizes: string }[] }
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    )
  })

  test('has no accessibility violations, also with the reason sheet open', async ({ page }) => {
    await page.goto('/')
    const scan = () =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()

    expect((await scan()).violations).toEqual([])

    await page.getByRole('button', { name: 'Not going' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect((await scan()).violations).toEqual([])
  })
})
