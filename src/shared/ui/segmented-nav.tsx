'use client'

import { motion } from 'motion/react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'

export type SegmentedNavItem = {
  href: string
  label: string
}

export type SegmentedNavProps = {
  /** Names the navigation for assistive technology, e.g. "Schedule". */
  label: string
  items: readonly SegmentedNavItem[]
}

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const

/**
 * Two or more views of one thing as a segmented control (e.g. this week and the season). Each
 * view is its own page, so the segments are links; the current one's marker glides between them.
 * One per screen: the marker's Motion layout id is shared.
 */
export function SegmentedNav({ label, items }: SegmentedNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label={label}>
      <ul
        className="grid gap-1 rounded-xl bg-surface-raised p-1"
        style={{ gridTemplateColumns: `repeat(${String(items.length)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isCurrent = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150',
                  isCurrent ? 'text-text-on-accent' : 'text-text-muted hover:text-text-default',
                )}
              >
                {isCurrent && (
                  <motion.span
                    layoutId="segmented-nav-current"
                    transition={SPRING}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-lg bg-accent-match"
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
