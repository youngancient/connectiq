import { describe, expect, it } from 'vitest'
import { loadEvent } from '../../data/events'
import { byArrival, hiddenPotential } from '../analytics'
import { scoreAll } from '../scoring'
import { QUESTIONS, type AnswerContext, type QuestionId } from './catalogue'

const { event, registrants } = loadEvent()
const scored = scoreAll(registrants, event.settings)
const ctx: AnswerContext = { scored, registrants, event }
const q = (id: QuestionId) => QUESTIONS.find((x) => x.id === id)!

describe('Ask the Data catalogue', () => {
  it('has 7 questions with unique ids', () => {
    expect(QUESTIONS).toHaveLength(7)
    expect(new Set(QUESTIONS.map((x) => x.id)).size).toBe(7)
  })

  it('top connectors match the leaderboard', () => {
    const a = q('top-connectors').answer(ctx)
    expect(a.table!.rows.map((r) => r[0])).toEqual(scored.slice(0, 5).map((x) => x.registrant.name))
    expect(a.sentence).toContain('tied with')
  })

  it('names the hidden-potential attendees from the finding', () => {
    const a = q('hidden-potential').answer(ctx)
    const expected = hiddenPotential(scored, { minPeople: 70, maxOpportunity: 40 })
    expect(a.table!.rows).toHaveLength(expected.length)
    expect(new Set(a.table!.ids)).toEqual(new Set(expected.map((x) => x.registrant.id)))
    expect(a.table!.rows[0][0]).toBe('Victor Okonkwo')
    expect(a.sentence).toContain('none of them applied')
  })

  it('counts speaker connections', () => {
    const n = scored.filter((x) => x.activity.connectedWithSpeaker).length
    expect(q('speaker').answer(ctx).sentence).toMatch(new RegExp(`^${n} attendees`))
  })

  it('lists everyone who applied', () => {
    const n = scored.filter((x) => x.activity.applied).length
    expect(q('applied').answer(ctx).table!.rows).toHaveLength(n)
  })

  it('lists question askers, most questions first', () => {
    const rows = q('questions').answer(ctx).table!.rows
    expect(rows).toHaveLength(22)
    expect(Number(rows[0][1])).toBeGreaterThanOrEqual(Number(rows[rows.length - 1][1]))
  })

  it('counts no-shows against registrations', () => {
    expect(q('no-shows').answer(ctx).sentence).toBe(
      "211 of the 361 people who registered didn't come. 150 checked in, a show-up rate of 42%.",
    )
  })

  it('compares arrival bands with the same numbers as the chart', () => {
    const a = q('late-arrivals').answer(ctx)
    const bands = byArrival(scored, event)
    expect(a.table!.rows.map((r) => r[2])).toEqual(bands.map((b) => b.connections.toFixed(1)))
    expect(a.sentence).toMatch(/^Only slightly/)
  })

  it('gives every name row an attendee id', () => {
    for (const question of QUESTIONS) {
      const t = question.answer(ctx).table
      if (t?.ids) expect(t.ids).toHaveLength(t.rows.length)
    }
  })

  it('answers without crashing when nobody checked in', () => {
    const empty = { ...ctx, scored: [] }
    for (const question of QUESTIONS) expect(() => question.answer(empty)).not.toThrow()
    expect(q('top-connectors').answer(empty).sentence).toContain('Nobody checked in')
  })
})
