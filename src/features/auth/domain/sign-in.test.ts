import { describe, expect, it } from 'vitest'

import { parseSignIn, toRejection } from './sign-in'

function form(values: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(values)) formData.set(name, value)
  return formData
}

describe('parseSignIn', () => {
  it('accepts an email and a password, trimming the email', () => {
    expect(parseSignIn(form({ email: ' saqib@example.com ', password: 'secret' }))).toEqual({
      success: true,
      credentials: { email: 'saqib@example.com', password: 'secret' },
    })
  })

  it('reports missing fields and an invalid email, keeping what was typed', () => {
    expect(parseSignIn(form({}))).toEqual({
      success: false,
      email: '',
      fieldErrors: { email: 'required', password: 'required' },
    })
    expect(parseSignIn(form({ email: 'saqib', password: 'x' }))).toEqual({
      success: false,
      email: 'saqib',
      fieldErrors: { email: 'invalidEmail' },
    })
  })

  it('reads a file field as empty', () => {
    const formData = form({ password: 'x' })
    formData.set('email', new Blob(['x']))

    expect(parseSignIn(formData)).toMatchObject({ fieldErrors: { email: 'required' } })
  })
})

describe('toRejection', () => {
  it('tells a locked account from wrong credentials', () => {
    expect(toRejection('This user is locked due to having too many failed login attempts.')).toBe(
      'locked',
    )
    expect(toRejection('The email or password provided is incorrect.')).toBe('credentials')
  })
})
