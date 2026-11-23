import { describe, expect, it } from 'vitest'
import { loadEvent } from '../data/events'
import { explainScore, weightedContributions } from './explain'
import { AREAS, round, scoreAll } from './scoring'
import { rebalance, sameWeights, toPercents, toWeights } from './weights'

const { event, registrants } = loadEvent()
const settings = event.settings
const scored = scoreAll(registrants, settings)
const byId = new Map(scored.map((a) => [a.registrant.id, a]))

describe('explainScore', () => {
  it('adds up to every attendee’s area scores', () => {
    for (const a of scored) {
      const ex = explainScore(a.activity, settings)
      for (const area of AREAS) {
        const total = round(ex[area].reduce((n, l) => n + l.points, 0))
        expect(Math.abs(total - a.areas[area]), `${a.registrant.id} ${area}`).toBeLessThanOrEqual(0.1)
      }
    }
  })

  it('describes CCI-002 in plain terms', () => {
    const a = byId.get('CCI-002')!
    const ex = explainScore(a.activity, settings)
    expect(ex.people[0]).toEqual({ label: '12 connections (capped at 10)', points: 60, max: 60 })
    expect(ex.people[1]).toEqual({ label: 'Joined the networking session', points: 20, max: 20 })
    expect(ex.people[2]).toEqual({ label: 'Did not connect with a speaker', points: 0, max: 20 })
    expect(ex.presence[0].label).toBe('Checked in at 2:39pm (88% punctuality)')
    expect(ex.presence[1]).toEqual({ label: 'Attended 4 of 4 sessions', points: 60, max: 60 })
  })

  it('gives each area a maximum of 100', () => {
    const ex = explainScore(scored[0].activity, settings)
    for (const area of AREAS) expect(ex[area].reduce((n, l) => n + l.max, 0)).toBe(100)
  })

  it('splits the Connect Score into weighted contributions', () => {
    const a = byId.get('CCI-002')!
    const c = weightedContributions(a.areas, settings)
    expect(c).toEqual({ people: 28, opportunity: 21, presence: 14.3, visibility: 4.5 })
  })
})

describe('rebalance', () => {
  const start = toPercents(settings.weights)
  const total = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0)

  it('always totals 100', () => {
    for (const area of AREAS) for (let v = 0; v <= 100; v += 7) expect(total(rebalance(start, area, v))).toBe(100)
  })

  it('keeps the other weights in proportion', () => {
    expect(rebalance(start, 'people', 50)).toEqual({ people: 50, opportunity: 27, presence: 12, visibility: 11 })
  })

  it('shares equally when the others are all zero', () => {
    const p = rebalance({ people: 100, opportunity: 0, presence: 0, visibility: 0 }, 'people', 40)
    expect(p).toEqual({ people: 40, opportunity: 20, presence: 20, visibility: 20 })
  })

  it('handles the extremes', () => {
    expect(rebalance(start, 'visibility', 100)).toEqual({ people: 0, opportunity: 0, presence: 0, visibility: 100 })
    expect(rebalance(start, 'people', -5).people).toBe(0)
  })

  it('does not drift when applied step by step from the same starting point', () => {
    let p = start
    for (let v = 36; v <= 60; v++) p = rebalance(start, 'people', v)
    expect(p).toEqual(rebalance(start, 'people', 60))
    expect(p.opportunity).toBeGreaterThan(p.presence)
  })

  it('round-trips between weights and percents', () => {
    expect(sameWeights(toWeights(start), settings.weights)).toBe(true)
  })
})
