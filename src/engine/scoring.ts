/**
 * The Connect Score engine: pure functions that reproduce the spreadsheet's
 * Scores tab exactly. No React, no I/O — same inputs, same outputs.
 *
 * Connect Score = wP·People + wO·Opportunity + wR·Presence + wV·Visibility
 */
import type { Activity, Registrant, Settings } from '../data/schema'

export type AreaKey = 'people' | 'opportunity' | 'presence' | 'visibility'
export const AREAS: readonly AreaKey[] = ['people', 'opportunity', 'presence', 'visibility']
export const AREA_LABELS: Record<AreaKey, string> = {
  people: 'People Connections',
  opportunity: 'Opportunity Capture',
  presence: 'Presence',
  visibility: 'Visibility',
}

export type Tier = 'Super Connector' | 'Active Connector' | 'Emerging Connector' | 'Passive Attendee'
export const TIERS: readonly Tier[] = ['Super Connector', 'Active Connector', 'Emerging Connector', 'Passive Attendee']

/** Points available for each line of the model (each area totals 100). */
export const POINTS = {
  people: { connections: 60, networking: 20, speaker: 20 },
  opportunity: { opportunities: 40, followups: 30, applied: 30 },
  presence: { punctuality: 40, sessions: 60 },
  visibility: { questions: 40, community: 30, linkedin: 30 },
} as const

/** Sessions counted for Presence: keynote, networking, panel, breakout. */
export const SESSION_COUNT = 4

export type AreaScores = Record<AreaKey, number>

/** A checked-in attendee with their computed scores. */
export interface ScoredAttendee {
  registrant: Registrant
  activity: Activity
  areas: AreaScores
  score: number
  tier: Tier
  /** Standard competition rank (ties share a rank: 1, 1, 3). */
  rank: number
}

/**
 * Rounds to `dp` decimals, half away from zero, the way spreadsheets do.
 * Values are first cleaned to 15 significant digits so float noise such as
 * 67.84999999999999 rounds the same as the spreadsheet's 67.85.
 */
export function round(value: number, dp = 1): number {
  const clean = Number(value.toPrecision(15))
  const f = 10 ** dp
  return (Math.sign(clean) * Math.round(Math.abs(clean) * f)) / f
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** "13:45" → 825 (minutes after midnight). */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 1 if checked in by event start, 0 at/after latest check-in, linear in between. */
export function punctuality(checkinTime: string, s: Settings): number {
  const latest = toMinutes(s.latestCheckin)
  return clamp01((latest - toMinutes(checkinTime)) / (latest - toMinutes(s.eventStart)))
}

export function sessionsAttended(a: Activity): number {
  return Number(a.keynote) + Number(a.networking) + Number(a.panel) + Number(a.breakout !== null)
}

const capped = (value: number, cap: number) => Math.min(value / cap, 1)

export function peopleScore(a: Activity, s: Settings): number {
  const p = POINTS.people
  return round(
    capped(a.connections, s.caps.connections) * p.connections +
      (a.networking ? p.networking : 0) +
      (a.connectedWithSpeaker ? p.speaker : 0),
  )
}

export function opportunityScore(a: Activity, s: Settings): number {
  const p = POINTS.opportunity
  return round(
    capped(a.opportunities, s.caps.opportunities) * p.opportunities +
      capped(a.followups, s.caps.followups) * p.followups +
      (a.applied ? p.applied : 0),
  )
}

export function presenceScore(a: Activity, s: Settings): number {
  const p = POINTS.presence
  return round(p.punctuality * punctuality(a.checkinTime, s) + p.sessions * (sessionsAttended(a) / SESSION_COUNT))
}

export function visibilityScore(a: Activity, s: Settings): number {
  const p = POINTS.visibility
  return round(
    capped(a.questions, s.caps.questions) * p.questions +
      (a.joinedCommunity ? p.community : 0) +
      (a.postedOnLinkedIn ? p.linkedin : 0),
  )
}

export function areaScores(a: Activity, s: Settings): AreaScores {
  return {
    people: peopleScore(a, s),
    opportunity: opportunityScore(a, s),
    presence: presenceScore(a, s),
    visibility: visibilityScore(a, s),
  }
}

/** Weighted total of the (already rounded) area scores, as the spreadsheet does. */
export function connectScore(areas: AreaScores, s: Settings): number {
  const w = s.weights
  return round(areas.people * w.people + areas.opportunity * w.opportunity + areas.presence * w.presence + areas.visibility * w.visibility)
}

export function tierFor(score: number, s: Settings): Tier {
  if (score >= s.tiers.super) return 'Super Connector'
  if (score >= s.tiers.active) return 'Active Connector'
  if (score >= s.tiers.emerging) return 'Emerging Connector'
  return 'Passive Attendee'
}

/**
 * Scores every checked-in registrant (no-shows are excluded) and ranks them.
 * Returned in rank order; ties keep the source order (attendee ID).
 */
export function scoreAll(registrants: readonly Registrant[], s: Settings): ScoredAttendee[] {
  const scored = registrants.flatMap((registrant) => {
    const activity = registrant.activity
    if (!activity) return []
    const areas = areaScores(activity, s)
    const score = connectScore(areas, s)
    return [{ registrant, activity, areas, score, tier: tierFor(score, s), rank: 0 }]
  })
  scored.sort((a, b) => b.score - a.score)
  scored.forEach((a, i) => {
    a.rank = i > 0 && a.score === scored[i - 1].score ? scored[i - 1].rank : i + 1
  })
  return scored
}

/** True when weights sum to 100% (within float tolerance). */
export function weightsAreValid(s: Settings): boolean {
  const w = s.weights
  return Math.abs(w.people + w.opportunity + w.presence + w.visibility - 1) < 1e-9
}
