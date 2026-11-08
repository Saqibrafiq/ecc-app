import { render, screen } from '@testing-library/react'
import { MotionConfigContext } from 'motion/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { MotionProvider } from './motion-provider'

function ReducedMotionSetting() {
  const { reducedMotion } = useContext(MotionConfigContext)
  return <span>{reducedMotion}</span>
}

describe('MotionProvider', () => {
  it("follows the member's reduce-motion setting", () => {
    render(
      <MotionProvider>
        <ReducedMotionSetting />
      </MotionProvider>,
    )

    expect(screen.getByText('user')).toBeInTheDocument()
  })
})
