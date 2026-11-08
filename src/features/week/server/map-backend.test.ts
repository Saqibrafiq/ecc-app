import { describe, expect, it } from 'vitest'

import {
  type FixtureDoc,
  getClubCode,
  parseEventId,
  toAnswerMap,
  toLocalDay,
  toMatchEvent,
  toPracticeEvent,
  toTeamName,
  toTeamPractice,
} from './map-backend'

const ECC_I = { id: 1, name: 'Erlangen Cricket Club I', shortName: 'ECC-I', isClubTeam: true }
const NCC = { id: 9, name: 'Nürnberg CC', shortName: 'NCC-I', isClubTeam: false }

const FIXTURE: FixtureDoc = {
  id: 12,
  date: '2027-05-08T12:00:00.000Z',
  startTime: '11:00',
  team1: NCC,
  team2: ECC_I,
  ground: { name: 'Nürnberg Langwasser', clubCode: 'NCC' },
  competition: { name: 'BCV T20 Regionalliga Bayern', maxOvers: 20 },
}

describe('names and codes', () => {
  it('names teams as members do', () => {
    expect(toTeamName('ECC-II')).toBe('ECC II')
  })

  it('reads the club code of a team', () => {
    expect(getClubCode('ECC-II')).toBe('ECC')
    expect(getClubCode(' ncc-1 ')).toBe('NCC')
    expect(getClubCode('SGMC')).toBe('SGMC')
  })

  it('reads a stored day in club time', () => {
    expect(toLocalDay('2027-05-08T12:00:00.000Z')).toBe('2027-05-08')
    // Just after midnight in Erlangen is still the previous day in UTC.
    expect(toLocalDay('2027-05-07T22:30:00.000Z')).toBe('2027-05-08')
  })
})

describe('toMatchEvent', () => {
  it("turns a fixture into the ECC team's match", () => {
    expect(toMatchEvent(FIXTURE)).toEqual({
      id: 'fixture-12',
      kind: 'match',
      team: { id: '1', name: 'ECC I' },
      date: '2027-05-08',
      startTime: '11:00',
      ground: 'Nürnberg Langwasser',
      opponent: 'Nürnberg CC',
      competition: 'BCV T20 Regionalliga Bayern',
      overs: 20,
      isHome: false,
    })
  })

  it('knows a home match by the ground and copes with missing details', () => {
    const event = toMatchEvent({
      ...FIXTURE,
      team1: ECC_I,
      team2: NCC,
      startTime: null,
      ground: { name: 'Erlangen', clubCode: 'ecc' },
      competition: { name: 'Friendly', maxOvers: null },
    })

    expect(event).toMatchObject({ isHome: true, startTime: null, opponent: 'Nürnberg CC' })
    expect(event?.overs).toBeUndefined()
    expect(toMatchEvent({ ...FIXTURE, ground: null, startTime: '25:00' })).toMatchObject({
      ground: '',
      startTime: null,
      isHome: false,
    })
  })

  it('ignores a fixture without an ECC team', () => {
    expect(toMatchEvent({ ...FIXTURE, team2: { ...NCC, id: 10, isClubTeam: null } })).toBeNull()
  })
})

describe('practices', () => {
  const doc = {
    id: 5,
    team: 1,
    date: '2027-05-05T12:00:00.000Z',
    startTime: '18:30',
    isCancelled: null,
    isRecorded: true,
  }

  it('turns a practice into an event at the club ground', () => {
    expect(toPracticeEvent(doc, { id: '1', name: 'ECC I' })).toEqual({
      id: 'practice-5',
      kind: 'practice',
      team: { id: '1', name: 'ECC I' },
      date: '2027-05-05',
      startTime: '18:30',
      ground: 'Erlangen',
    })
    expect(
      toPracticeEvent({ ...doc, ground: 'Indoor hall' }, { id: '1', name: 'ECC I' }).ground,
    ).toBe('Indoor hall')
  })

  it('turns a practice into the attendance rule’s input', () => {
    expect(toTeamPractice(doc)).toEqual({
      id: 'practice-5',
      date: '2027-05-05',
      isCancelled: false,
      isRecorded: true,
    })
  })
})

describe('answers and ids', () => {
  it('maps answers to event ids', () => {
    expect(
      toAnswerMap([
        { id: 1, fixture: 12, practice: null, response: 'going', reason: null },
        { id: 2, fixture: null, practice: 5, response: 'not-going', reason: 'Work' },
        { id: 3, fixture: null, practice: null, response: 'going' },
      ]),
    ).toEqual({
      'fixture-12': { answer: 'going', reason: null },
      'practice-5': { answer: 'not-going', reason: 'Work' },
    })
  })

  it('parses an event id back to the backend document', () => {
    expect(parseEventId('fixture-12')).toEqual({ kind: 'fixture', backendId: 12 })
    expect(parseEventId('practice-5')).toEqual({ kind: 'practice', backendId: 5 })
    expect(parseEventId('sample-ecc1-match')).toBeNull()
  })
})
