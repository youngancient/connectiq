import { describe, expect, it } from 'vitest'
import { THRESHOLDS } from '../config/site'
import { loadEvent } from '../data/events'
import { byArrival, byNetworking, byTrack, describeDifference, hiddenPotential } from './analytics'
import { arrivalFinding, keyFindings, networkingFinding, trackFinding } from './findings'
import { scoreAll } from './scoring'

const { event, registrants } = loadEvent()
const scored = scoreAll(registrants, event.settings)

describe('analytics used by findings', () => {
  it('splits arrivals into three bands from the schedule', () => {
    const bands = byArrival(scored, event)
    expect(bands.map((b) => b.key)).toEqual(['By 13:45', '13:46–14:29', '14:30 or later'])
    expect(bands.reduce((n, b) => n + b.n, 0)).toBe(scored.length)
  })

  it('compares networking attendance', () => {
    const { attended, skipped } = byNetworking(scored)
    expect(attended!.n + skipped!.n).toBe(scored.length)
    expect(attended!.connections).toBeGreaterThan(skipped!.connections)
  })

  it('excludes attendees who left before breakouts from track averages', () => {
    const inTracks = byTrack(scored).reduce((n, g) => n + g.n, 0)
    expect(inTracks).toBe(scored.filter((a) => a.activity.breakout !== null).length)
  })

  it('finds hidden potential by threshold', () => {
    const hp = hiddenPotential(scored, THRESHOLDS.hiddenPotential)
    expect(hp.every((a) => a.areas.people >= 70 && a.areas.opportunity < 40)).toBe(true)
  })

  it('words differences neutrally', () => {
    expect(describeDifference(0.5, 5)).toBe('about the same as')
    expect(describeDifference(3, 5)).toBe('slightly higher than')
    expect(describeDifference(-8, 5)).toBe('lower than')
  })
})

describe('key findings at default weights', () => {
  const ids = keyFindings(scored, event, THRESHOLDS).map((f) => f.id)

  it('reports the findings the data supports', () => {
    expect(ids).toEqual(['networking', 'arrival', 'track', 'hidden-potential'])
  })

  it('states the networking gap with its numbers', () => {
    const f = networkingFinding(scored, THRESHOLDS)!
    const { attended, skipped } = byNetworking(scored)
    expect(f.stat).toBe(`+${(attended!.connections - skipped!.connections).toFixed(1)}`)
    expect(f.detail).toContain(`${attended!.n} who joined`)
  })

  it('does not report a finding when the gap is below the threshold', () => {
    const strict = { ...THRESHOLDS, notableDifference: 100, notableConnections: 100 }
    expect(networkingFinding(scored, strict)).toBeNull()
    expect(arrivalFinding(scored, event, strict)).toBeNull()
    expect(trackFinding(scored, strict)).toBeNull()
  })

  it('never headlines a group smaller than the minimum size', () => {
    const big = { ...THRESHOLDS, minGroupSize: 1000 }
    expect(keyFindings(scored, event, big).map((f) => f.id)).toEqual(['hidden-potential'])
  })
})
