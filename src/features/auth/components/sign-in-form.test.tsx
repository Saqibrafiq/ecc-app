import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { SignInState } from '../domain/sign-in'
import { SignInForm } from './sign-in-form'

function renderForm(result: SignInState) {
  const signIn = vi.fn(() => Promise.resolve(result))
  renderWithIntl(<SignInForm signIn={signIn} />)
  return signIn
}

async function submit() {
  await userEvent.type(screen.getByLabelText('Email'), 'saqib@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInForm', () => {
  it('sends the email and password', async () => {
    const signIn = renderForm({ status: 'idle' })

    await submit()

    const formData = (signIn.mock.calls[0] as unknown as [SignInState, FormData])[1]
    expect(formData.get('email')).toBe('saqib@example.com')
    expect(formData.get('password')).toBe('secret')
  })

  it('marks fields the server found invalid, keeping the email', async () => {
    renderForm({ status: 'invalid', email: 'saqib', fieldErrors: { email: 'invalidEmail' } })

    await submit()

    const email = await screen.findByLabelText('Email')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Please enter a valid email address.')
    expect(email).toHaveValue('saqib')
  })

  it('says when the email or password is wrong', async () => {
    renderForm({ status: 'rejected', email: 'saqib@example.com', reason: 'credentials' })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is not right.')
  })

  it('says when the account is locked, or signing in failed', async () => {
    renderForm({ status: 'rejected', email: 'a@b.c', reason: 'locked' })
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/locked for a while/)
  })

  it('reports a server error', async () => {
    renderForm({ status: 'error', email: 'a@b.c' })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Signing in is not possible right now. Please try again.',
    )
  })
})
