import { describe, expect, it } from 'vitest'
import expectedCsv from '../../data/cci-stem-connect-2026/expected-scores.csv?raw'
import { loadEvent } from '../data/events'
import { parseCsv } from '../data/csv'
import { round, scoreAll, tierFor, punctuality, weightsAreValid, TIERS } from './scoring'

const { event, registrants } = loadEvent()
const settings = event.settings
const scored = scoreAll(registrants, settings)
const byId = new Map(scored.map((a) => [a.registrant.id, a]))

describe('dataset', () => {
  it('has 125 registrations and 104 check-ins', () => {
    expect(registrants).toHaveLength(125)
    expect(scored).toHaveLength(104)
  })
})

describe('reference values from the PRD', () => {
  it('scores CCI-002 Obinna Okeke exactly', () => {
    const a = byId.get('CCI-002')!
    expect(a.registrant.name).toBe('Obinna Okeke')
    expect(a.areas).toEqual({ people: 80, opportunity: 60, presence: 95.2, visibility: 30 })
    expect(a.score).toBe(67.8)
    expect(a.tier).toBe('Active Connector')
  })

  it('has a tie for rank 1 at 91.9', () => {
    const top = scored.filter((a) => a.rank === 1)
    expect(top.map((a) => a.registrant.name).sort()).toEqual(['Fatima Salami', 'Yusuf Uzor'])
    expect(top.every((a) => a.score === 91.9)).toBe(true)
    expect(scored[2].rank).toBe(3)
  })

  it('has tier counts 20 / 32 / 25 / 27', () => {
    const counts = TIERS.map((t) => scored.filter((a) => a.tier === t).length)
    expect(counts).toEqual([20, 32, 25, 27])
  })
})

describe('matches the spreadsheet Scores tab for every attendee', () => {
  const [, ...rows] = parseCsv(expectedCsv)

  it('covers all 104 attendees', () => expect(rows).toHaveLength(104))

  it.each(rows)('%s', (id, people, opportunity, presence, visibility, score, tier) => {
    const a = byId.get(id)
    expect(a, `${id} not scored`).toBeDefined()
    expect(a!.areas).toEqual({
      people: Number(people),
      opportunity: Number(opportunity),
      presence: Number(presence),
      visibility: Number(visibility),
    })
    expect(a!.score).toBe(Number(score))
    expect(a!.tier).toBe(tier)
  })
})

describe('helpers', () => {
  it('rounds half away from zero, ignoring float noise', () => {
    expect(round(67.85)).toBe(67.9)
    expect(round(0.1 + 0.2)).toBe(0.3)
    expect(round(-1.25)).toBe(-1.3)
  })

  it('clamps punctuality to 0–1', () => {
    expect(punctuality('13:15', settings)).toBe(1)
    expect(punctuality('13:45', settings)).toBe(1)
    expect(punctuality('15:00', settings)).toBe(0)
    expect(punctuality('15:30', settings)).toBe(0)
    expect(punctuality('14:22', settings)).toBeCloseTo(38 / 75)
  })

  it('assigns tiers at the boundaries', () => {
    expect(tierFor(75, settings)).toBe('Super Connector')
    expect(tierFor(74.9, settings)).toBe('Active Connector')
    expect(tierFor(55, settings)).toBe('Active Connector')
    expect(tierFor(35, settings)).toBe('Emerging Connector')
    expect(tierFor(34.9, settings)).toBe('Passive Attendee')
  })

  it('validates that weights total 100%', () => {
    expect(weightsAreValid(settings)).toBe(true)
    expect(weightsAreValid({ ...settings, weights: { ...settings.weights, people: 0.4 } })).toBe(false)
  })

  it('recalculates when weights change', () => {
    const peopleOnly = { ...settings, weights: { people: 1, opportunity: 0, presence: 0, visibility: 0 } }
    const a = scoreAll(registrants, peopleOnly).find((x) => x.registrant.id === 'CCI-002')!
    expect(a.score).toBe(80)
  })
})
