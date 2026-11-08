import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

const logError = vi.hoisted(() => vi.fn())

vi.mock('@/shared/lib/log', () => ({ logError }))

const { default: LocaleError } = await import('./error')

describe('LocaleError', () => {
  it('says plainly that the screen failed, logs why, and retries', async () => {
    const retry = vi.fn()
    const error = new Error('backend down')
    renderWithIntl(<LocaleError error={error} retry={retry} />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(logError).toHaveBeenCalledWith('A screen failed to load', error)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(retry).toHaveBeenCalledOnce()
  })
})
