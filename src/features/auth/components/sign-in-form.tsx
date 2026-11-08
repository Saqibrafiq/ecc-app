'use client'

import { LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

import { INITIAL_SIGN_IN_STATE, type SignInField, type SignInState } from '../domain/sign-in'

export type SignInFormProps = {
  signIn: (state: SignInState, formData: FormData) => Promise<SignInState>
}

const INPUT_CLASS =
  'min-h-12 w-full rounded-xl border border-border-strong bg-surface-card px-3 text-base text-text-default placeholder:text-text-muted aria-invalid:border-status-missed-text'

/** Email and password of the member's club account. */
export function SignInForm({ signIn }: SignInFormProps) {
  const t = useTranslations('signIn')
  const id = useId()
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_SIGN_IN_STATE)
  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {}
  const email = state.status === 'idle' ? '' : state.email
  const errorId = (field: SignInField) => `${id}-${field}-error`

  let alert: string | null = null
  if (state.status === 'rejected') alert = t(`rejected.${state.reason}`)
  if (state.status === 'error') alert = t('error')

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {alert && (
        <p
          role="alert"
          className="rounded-xl bg-status-missed-surface p-3 text-sm font-medium text-status-missed-text"
        >
          {alert}
        </p>
      )}
      {(['email', 'password'] as const).map((field) => (
        <div key={field} className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-${field}`} className="text-sm font-semibold">
            {t(field)}
          </label>
          <input
            id={`${id}-${field}`}
            name={field}
            type={field === 'email' ? 'email' : 'password'}
            autoComplete={field === 'email' ? 'email' : 'current-password'}
            defaultValue={field === 'email' ? email : undefined}
            required
            aria-invalid={fieldErrors[field] ? true : undefined}
            aria-describedby={fieldErrors[field] ? errorId(field) : undefined}
            className={cn(INPUT_CLASS)}
          />
          {fieldErrors[field] && (
            <p id={errorId(field)} className="text-sm font-medium text-status-missed-text">
              {t(`errors.${fieldErrors[field]}`)}
            </p>
          )}
        </div>
      ))}
      <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
        {isPending && (
          <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
        )}
        {isPending ? t('signingIn') : t('submit')}
      </Button>
      <p className="text-sm text-text-muted">{t('help')}</p>
    </form>
  )
}
