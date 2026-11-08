import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export type PageMainProps = {
  children: ReactNode
  /** Leaves room for the bottom navigation; task screens (a check-in) have none. */
  hasNav?: boolean
}

/** A screen's main landmark: phone width, clear of the notch, and of the navigation if shown. */
export function PageMain({ children, hasNav = true }: PageMainProps) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]',
        hasNav ? 'pb-28' : 'pb-0',
      )}
    >
      {children}
    </main>
  )
}
