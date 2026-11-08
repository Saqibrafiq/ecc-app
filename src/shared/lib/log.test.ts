import { describe, expect, it, vi } from 'vitest'

import { logError } from './log'

describe('logError', () => {
  it('writes the message and its cause to the server log', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const cause = new Error('backend down')

    logError('Saving an answer failed', cause)

    expect(spy).toHaveBeenCalledWith('Saving an answer failed', cause)
    spy.mockRestore()
  })
})
