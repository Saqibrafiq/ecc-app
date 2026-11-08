import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StateCard } from './state-card'

describe('StateCard', () => {
  it('names the state in a heading and explains it', () => {
    render(<StateCard icon={null} title="Quiet week" text="No match this week." />)

    expect(screen.getByRole('heading', { level: 2, name: 'Quiet week' })).toBeInTheDocument()
    expect(screen.getByText('No match this week.')).toBeInTheDocument()
  })

  it('shows a way on when given one', () => {
    render(
      <StateCard icon={null} title="Not found" text="This match is gone.">
        <button type="button">Try again</button>
      </StateCard>,
    )

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('is the page heading when it is the whole screen', () => {
    render(<StateCard icon={null} title="Not found" text="Gone." headingLevel={1} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument()
  })
})
