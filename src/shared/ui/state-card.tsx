import type { ReactNode } from 'react'

export type StateCardProps = {
  icon: ReactNode
  title: string
  text: string
  /** `h1` when the state is the whole screen (one per page), otherwise `h2`. */
  headingLevel?: 1 | 2
  /** An optional way on, e.g. a link back to the week. */
  children?: ReactNode
}

/** An empty, unavailable or not-yet-possible state, said plainly, with an optional way on. */
export function StateCard({ icon, title, text, headingLevel = 2, children }: StateCardProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <section className="flex flex-col items-start gap-3 rounded-2xl border border-border-default bg-surface-card p-5">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-raised text-accent-practice">
        {icon}
      </span>
      <Heading className="font-display text-2xl leading-none font-bold uppercase">{title}</Heading>
      <p className="text-text-muted">{text}</p>
      {children}
    </section>
  )
}
