import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** A 1×1 PNG, standing in for a phone photo of the signed sheet. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

test.describe('match day', () => {
  test('lists the squad with its passes and flags a missing one', async ({ page }) => {
    await page.goto('/team/match-day/201')

    await expect(page.getByRole('heading', { level: 1, name: 'vs Nürnberg CC' })).toBeVisible()
    await expect(page.getByText(/No Spielerpass yet for/)).toBeVisible()
    const squad = page.getByRole('region', { name: 'Squad and Spielerpasses' })
    await expect(squad.getByRole('listitem')).toHaveCount(12)
    await expect(squad.getByText('No Spielerpass')).toBeVisible()
    await expect(page).toHaveTitle('Match day')
  })

  test('takes a photo of the signed sheet', async ({ page }) => {
    await page.goto('/team/match-day/201')

    await page
      .getByLabel('Upload photo')
      .setInputFiles({ name: 'sheet.png', mimeType: 'image/png', buffer: PIXEL })

    await expect(page.getByRole('status')).toHaveText('Photo uploaded.')
    await expect(page.getByLabel('Replace photo')).toBeAttached()
  })

  test('speaks German under /de', async ({ page }) => {
    await page.goto('/de/team/match-day/201')

    await expect(page.getByRole('heading', { level: 2, name: 'Spielberichtsbogen' })).toBeVisible()
  })

  test('has no accessibility violations', async ({ page }) => {
    for (const path of ['/team/match-day/201', '/team/match-day/9']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze()
      expect(scan.violations, path).toEqual([])
    }
  })
})
