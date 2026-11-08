'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'

export type BottomNavItem = {
  href: string
  label: string
  icon: ReactNode
  /** Not built yet: shown, but not a link. */
  isComingSoon?: boolean
}

export type BottomNavProps = {
  label: string
  items: readonly BottomNavItem[]
  comingSoonLabel: string
}

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const
const ITEM_CLASS =
  'relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold'

/**
 * The app's main navigation, fixed to the bottom edge where the thumb rests. The current page's
 * marker glides between items (one shared Motion layout element).
 */
export function BottomNav({ label, items, comingSoonLabel }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 py-1.5">
        {items.map((item) => {
          const isCurrent = pathname === item.href
          return (
            <li key={item.href}>
              {item.isComingSoon ? (
                <span aria-disabled="true" className={cn(ITEM_CLASS, 'text-text-muted opacity-60')}>
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="sr-only">({comingSoonLabel})</span>
                </span>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    ITEM_CLASS,
                    'transition-colors duration-150',
                    isCurrent ? 'text-accent-match' : 'text-text-muted hover:text-text-default',
                  )}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="bottom-nav-current"
                      transition={SPRING}
                      aria-hidden="true"
                      className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent-match"
                    />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
