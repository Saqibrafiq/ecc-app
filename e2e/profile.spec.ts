import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('your profile', () => {
  test('shows who you are, your team and your role', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Profile' })
      .click()

    await expect(page.getByRole('heading', { level: 1, name: 'Your profile' })).toBeVisible()
    const card = page.getByRole('region', { name: 'Member' })
    await expect(card).toContainText('Saqib Rafiq')
    await expect(card).toContainText('ECC I · Captain of ECC I')
    await expect(page).toHaveTitle('Profile')
    // The preview has no member to register a device for.
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText(
      "Notifications aren't available yet.",
    )
  })

  test('serves the service worker uncached, allowed to load only itself', async ({ request }) => {
    const response = await request.get('/sw.js')

    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe('no-cache, no-store, must-revalidate')
    expect(response.headers()['content-security-policy']).toBe(
      "default-src 'self'; script-src 'self'",
    )
    expect(await response.text()).toContain("addEventListener('push'")
  })

  test('switches the app to German and keeps it', async ({ page }) => {
    await page.goto('/profile')

    await page.getByRole('button', { name: 'Deutsch' }).click()

    await expect(page).toHaveURL(/\/de\/profile$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dein Profil' })).toBeVisible()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
  })
})
