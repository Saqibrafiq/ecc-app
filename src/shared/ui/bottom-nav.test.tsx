import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { BottomNav } from './bottom-nav'

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('BottomNav', () => {
  it('marks the current page and shows unfinished pages without a link', () => {
    renderWithIntl(
      <BottomNav
        label="Main"
        comingSoonLabel="coming soon"
        items={[
          { href: '/', label: 'Week', icon: null },
          { href: '/attendance', label: 'Attendance', icon: null, isComingSoon: true },
        ]}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Week' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: /Attendance/ })).not.toBeInTheDocument()
    expect(screen.getByText('Attendance').closest('[aria-disabled="true"]')).not.toBeNull()
    expect(screen.getByText('(coming soon)')).toBeInTheDocument()
  })
})
