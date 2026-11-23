import { describe, expect, it } from 'vitest'
import { loadEvent } from '../data/events'
import { kpis, mean } from './analytics'
import { scoreAll } from './scoring'

const { event, registrants } = loadEvent()
const scored = scoreAll(registrants, event.settings)

describe('kpis', () => {
  const k = kpis(registrants, scored)

  it('counts registrations, attendance and show-up rate', () => {
    expect(k.registered).toBe(361)
    expect(k.attended).toBe(150)
    expect(k.showUpRate).toBeCloseTo(150 / 361)
  })

  it('counts Super Connectors and applicants from the data', () => {
    expect(k.superConnectors).toBe(28)
    expect(k.applied).toBe(registrants.filter((r) => r.activity?.applied).length)
  })

  it('averages the Connect Score', () => {
    expect(k.averageScore).toBeCloseTo(mean(scored.map((a) => a.score)), 1)
  })

  it('handles an empty event', () => {
    expect(kpis([], [])).toMatchObject({ registered: 0, attended: 0, showUpRate: 0, averageScore: 0 })
  })
})
