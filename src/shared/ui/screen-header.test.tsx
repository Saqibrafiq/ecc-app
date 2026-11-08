import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { ScreenHeader } from './screen-header'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('ScreenHeader', () => {
  it('names the screen in the page heading, with where it belongs', () => {
    renderWithIntl(<ScreenHeader eyebrow="ECC I · Captain" title="Your team" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your team' })).toBeInTheDocument()
    expect(screen.getByText('ECC I · Captain')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers the way back, the preview note and extra content', () => {
    renderWithIntl(
      <ScreenHeader
        eyebrow="Check-in"
        title="ECC I practice"
        back={{ href: '/team', label: 'Team' }}
        previewNote="Preview with sample data"
      >
        <p>15 going</p>
      </ScreenHeader>,
    )

    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/team')
    expect(screen.getByText('Preview with sample data')).toBeInTheDocument()
    expect(screen.getByText('15 going')).toBeInTheDocument()
  })
})
