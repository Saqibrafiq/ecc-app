import { describe, expect, it } from 'vitest'

import { buildTeamSheet } from './build-team-sheet'

const NAMES = new Map([
  ['1', 'Saqib Rafiq'],
  ['2', 'Ali Shaan'],
  ['3', 'Bilal Mir'],
])

describe('buildTeamSheet', () => {
  it('lists the squad in sheet order with names, marking the member looking at it', () => {
    const sheet = buildTeamSheet(
      [
        { playerId: '3', role: 'twelfth' },
        { playerId: '2', role: 'playing' },
        { playerId: '1', role: 'playing' },
      ],
      NAMES,
      '1',
    )

    expect(sheet).toEqual([
      { playerId: '2', name: 'Ali Shaan', role: 'playing', isViewer: false },
      { playerId: '1', name: 'Saqib Rafiq', role: 'playing', isViewer: true },
      { playerId: '3', name: 'Bilal Mir', role: 'twelfth', isViewer: false },
    ])
  })

  it('keeps an unnamed player in place, and marks nobody for a member without a player', () => {
    expect(buildTeamSheet([{ playerId: '9', role: 'reserve' }], NAMES, null)).toEqual([
      { playerId: '9', name: '', role: 'reserve', isViewer: false },
    ])
  })
})
