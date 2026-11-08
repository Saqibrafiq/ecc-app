import type { Preview } from '@storybook/nextjs-vite'
import { NextIntlClientProvider } from 'next-intl'

import en from '../src/i18n/messages/en.json'
import { TIME_ZONE } from '../src/i18n/routing'
import { MotionProvider } from '../src/shared/ui/motion-provider'

import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // Accessibility violations fail story tests, mirroring the axe gate in Playwright.
    a11y: { test: 'error' },
    nextjs: { appDirectory: true },
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={en} timeZone={TIME_ZONE}>
        <MotionProvider>
          <Story />
        </MotionProvider>
      </NextIntlClientProvider>
    ),
  ],
}

export default preview
