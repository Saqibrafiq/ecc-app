import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { DateTile } from './date-tile'

describe('DateTile', () => {
  it('shows the weekday, the day and the month', () => {
    renderWithIntl(<DateTile date={new Date('2026-11-14T12:00:00Z')} tone="match" />)

    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('14')).toHaveClass('text-accent-match')
    expect(screen.getByText('Nov')).toBeInTheDocument()
  })

  it('uses the practice colour for a practice', () => {
    renderWithIntl(<DateTile date={new Date('2026-11-11T12:00:00Z')} tone="practice" />)

    expect(screen.getByText('11')).toHaveClass('text-accent-practice')
  })
})
