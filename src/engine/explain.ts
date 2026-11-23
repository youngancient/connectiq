/**
 * Explains a score line by line, using the same constants as the scoring
 * engine, so the explanation can never drift from the maths.
 */
import type { Activity, Settings } from '../data/schema'
import { AREAS, formatClock, POINTS, punctuality, round, SESSION_COUNT, sessionsAttended, type AreaKey } from './scoring'

export interface ScoreLine {
  /** What the attendee did, e.g. "12 connections (capped at 10)". */
  label: string
  points: number
  max: number
}

export type Explanation = Record<AreaKey, ScoreLine[]>

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const cappedLabel = (n: number, cap: number, one: string, many?: string) =>
  `${plural(n, one, many)}${n > cap ? ` (capped at ${cap})` : ''}`
const yes = (done: boolean, did: string, didNot: string, max: number): ScoreLine => ({
  label: done ? did : didNot,
  points: done ? max : 0,
  max,
})
const share = (n: number, cap: number) => Math.min(n / cap, 1)

export function explainScore(a: Activity, s: Settings): Explanation {
  const P = POINTS
  const sessions = sessionsAttended(a)
  const p = punctuality(a.checkinTime, s)
  const at = formatClock(a.checkinTime)
  return {
    people: [
      { label: cappedLabel(a.connections, s.caps.connections, 'connection'), points: round(share(a.connections, s.caps.connections) * P.people.connections), max: P.people.connections },
      yes(a.networking, 'Joined the networking session', 'Missed the networking session', P.people.networking),
      yes(a.connectedWithSpeaker, 'Connected with a speaker', 'Did not connect with a speaker', P.people.speaker),
    ],
    opportunity: [
      { label: cappedLabel(a.opportunities, s.caps.opportunities, 'opportunity explored', 'opportunities explored'), points: round(share(a.opportunities, s.caps.opportunities) * P.opportunity.opportunities), max: P.opportunity.opportunities },
      { label: cappedLabel(a.followups, s.caps.followups, 'follow-up within a week', 'follow-ups within a week'), points: round(share(a.followups, s.caps.followups) * P.opportunity.followups), max: P.opportunity.followups },
      yes(a.applied, 'Applied for an opportunity', 'Did not apply for an opportunity', P.opportunity.applied),
    ],
    presence: [
      {
        label: p === 1 ? `Checked in at ${at}, on time` : p === 0 ? `Checked in at ${at}, too late for punctuality points` : `Checked in at ${at} (${Math.round(p * 100)}% punctuality)`,
        points: round(p * P.presence.punctuality),
        max: P.presence.punctuality,
      },
      { label: `Attended ${sessions} of ${SESSION_COUNT} sessions`, points: round((sessions / SESSION_COUNT) * P.presence.sessions), max: P.presence.sessions },
    ],
    visibility: [
      { label: cappedLabel(a.questions, s.caps.questions, 'question asked', 'questions asked'), points: round(share(a.questions, s.caps.questions) * P.visibility.questions), max: P.visibility.questions },
      yes(a.joinedCommunity, 'Joined the CCI STEM community', 'Did not join the CCI STEM community', P.visibility.community),
      yes(a.postedOnLinkedIn, 'Posted about the event on LinkedIn', 'Did not post about the event on LinkedIn', P.visibility.linkedin),
    ],
  }
}

/** Points each area adds to the Connect Score at the current weights. */
export function weightedContributions(areas: Record<AreaKey, number>, s: Settings): Record<AreaKey, number> {
  return Object.fromEntries(AREAS.map((k) => [k, round(areas[k] * s.weights[k])])) as Record<AreaKey, number>
}
