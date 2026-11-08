import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach, vi } from 'vitest'

// Animations finish at once in tests: assertions see the end state, not a frame in between.
MotionGlobalConfig.skipAnimations = true

// jsdom has no matchMedia (Motion reads prefers-reduced-motion): a device with default settings.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }) as unknown as MediaQueryList

afterEach(() => {
  cleanup()
})
