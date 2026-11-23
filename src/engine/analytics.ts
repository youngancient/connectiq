/**
 * Aggregate statistics over scored attendees. Pure functions: the UI and
 * Ask the Data both call these, so their numbers always agree.
 */
import type { Registrant } from '../data/schema'
import { round, type ScoredAttendee } from './scoring'

export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export interface Kpis {
  registered: number
  attended: number
  /** 0–1 */
  showUpRate: number
  averageScore: number
  superConnectors: number
  applied: number
}

export function kpis(registrants: readonly Registrant[], scored: readonly ScoredAttendee[]): Kpis {
  return {
    registered: registrants.length,
    attended: scored.length,
    showUpRate: registrants.length ? scored.length / registrants.length : 0,
    averageScore: round(mean(scored.map((a) => a.score))),
    superConnectors: scored.filter((a) => a.tier === 'Super Connector').length,
    applied: scored.filter((a) => a.activity.applied).length,
  }
}
