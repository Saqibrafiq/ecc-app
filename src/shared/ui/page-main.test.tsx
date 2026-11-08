import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageMain } from './page-main'

describe('PageMain', () => {
  it('is the main landmark, clear of the bottom navigation', () => {
    render(<PageMain>Week</PageMain>)

    expect(screen.getByRole('main')).toHaveClass('pb-28')
  })

  it('needs no room for navigation on a task screen', () => {
    render(<PageMain hasNav={false}>Check-in</PageMain>)

    expect(screen.getByRole('main')).toHaveClass('pb-0')
  })
})
