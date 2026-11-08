import { z } from 'zod'

export type SignInField = 'email' | 'password'
export type SignInFieldError = 'required' | 'invalidEmail'
export type SignInRejection = 'credentials' | 'locked'

export type SignInState =
  | { status: 'idle' }
  | {
      status: 'invalid'
      email: string
      fieldErrors: Partial<Record<SignInField, SignInFieldError>>
    }
  | { status: 'rejected'; email: string; reason: SignInRejection }
  | { status: 'error'; email: string }

export const INITIAL_SIGN_IN_STATE: SignInState = { status: 'idle' }

const signInSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('invalidEmail')),
  password: z.string().min(1, 'required'),
})

export type Credentials = z.infer<typeof signInSchema>

function readText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function toFieldError(message: string): SignInFieldError {
  return message === 'invalidEmail' ? 'invalidEmail' : 'required'
}

/** Validates the sign-in form; errors are codes the form translates. */
export function parseSignIn(
  formData: FormData,
):
  | { success: true; credentials: Credentials }
  | { success: false; email: string; fieldErrors: Partial<Record<SignInField, SignInFieldError>> } {
  const email = readText(formData, 'email')
  const parsed = signInSchema.safeParse({ email, password: readText(formData, 'password') })
  if (parsed.success) return { success: true, credentials: parsed.data }

  const fieldErrors: Partial<Record<SignInField, SignInFieldError>> = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if ((field === 'email' || field === 'password') && !fieldErrors[field]) {
      fieldErrors[field] = toFieldError(issue.message)
    }
  }
  return { success: false, email, fieldErrors }
}

const LOCKED_PATTERN = /locked/i

/** How Payload refused a login: wrong email or password, or an account locked after attempts. */
export function toRejection(message: string): SignInRejection {
  return LOCKED_PATTERN.test(message) ? 'locked' : 'credentials'
}
