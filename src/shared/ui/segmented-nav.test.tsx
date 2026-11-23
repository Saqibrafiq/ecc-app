import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { SegmentedNav } from './segmented-nav'

const pathname = vi.hoisted(() => ({ value: '/' }))

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => pathname.value,
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const ITEMS = [
  { href: '/', label: 'This week' },
  { href: '/season', label: 'Season' },
]

describe('SegmentedNav', () => {
  it('links every view and marks the current one', () => {
    pathname.value = '/season'
    renderWithIntl(<SegmentedNav label="Schedule" items={ITEMS} />)

    const nav = screen.getByRole('navigation', { name: 'Schedule' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'This week' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'This week' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Season' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks no view on a page outside it', () => {
    pathname.value = '/profile'
    renderWithIntl(<SegmentedNav label="Schedule" items={ITEMS} />)

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current')
    }
  })
})
