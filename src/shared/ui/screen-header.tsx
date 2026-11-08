import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'

export type ScreenHeaderProps = {
  eyebrow: string
  title: string
  /** A way back up, e.g. from a check-in to the team. */
  back?: { href: string; label: string }
  /** Shown in the preview: what the sample data stands for. */
  previewNote?: string
  children?: ReactNode
}

/** A screen's heading: where it belongs, what it is, and the way back up. */
export function ScreenHeader({ eyebrow, title, back, previewNote, children }: ScreenHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-xl px-2 text-sm font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-text-default"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
      )}
      {previewNote && (
        <p className="self-start rounded-full border border-accent-practice/40 px-3 py-1 text-xs font-semibold text-accent-practice">
          {previewNote}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-accent-match uppercase">
          {eyebrow}
        </span>
        <h1 className="font-display text-4xl leading-none font-bold text-balance uppercase">
          {title}
        </h1>
      </div>
      {children}
    </header>
  )
}
