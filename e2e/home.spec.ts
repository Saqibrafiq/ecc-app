import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('home', () => {
  test('greets the member in English by default', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Your week' })).toBeVisible()
    await expect(page).toHaveTitle('ECC App')
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de')

    await expect(page.getByRole('heading', { level: 1, name: 'Deine Woche' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
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

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
