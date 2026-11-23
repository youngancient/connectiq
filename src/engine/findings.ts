/**
 * Key findings: plain-English statements generated from the analytics.
 * A finding is only returned when the data supports it at the current weights.
 */
import type { EventInfo } from '../data/schema'
import {
  byArrival, byCategory, byNetworking, byRole, byTrack, hiddenPotential, mean, type GroupStats,
} from './analytics'
import { AREA_LABELS, round, type AreaKey, type ScoredAttendee } from './scoring'

export interface Finding {
  id: 'networking' | 'arrival' | 'role' | 'category' | 'track' | 'hidden-potential'
  /** The headline number, already formatted (e.g. "+4.4"). */
  stat: string
  /** What the number measures (e.g. "connections"). */
  statUnit: string
  headline: string
  detail: string
  /** Anchor of the section that shows the evidence, if one does. */
  href: string | null
}

export interface FindingThresholds {
  notableDifference: number
  notableConnections: number
  minGroupSize: number
  hiddenPotential: { minPeople: number; maxOpportunity: number }
}

const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)}`
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function networkingFinding(scored: readonly ScoredAttendee[], t: FindingThresholds): Finding | null {
  const { attended, skipped } = byNetworking(scored)
  if (!attended || !skipped || skipped.n < t.minGroupSize) return null
  const diff = round(attended.connections - skipped.connections)
  if (Math.abs(diff) < t.notableConnections) return null
  return {
    id: 'networking',
    stat: signed(diff),
    statUnit: 'connections',
    headline: `Attendees who joined the networking session made ${Math.abs(diff).toFixed(1)} ${diff > 0 ? 'more' : 'fewer'} connections on average.`,
    detail: `${attended.connections.toFixed(1)} connections for the ${attended.n} who joined, against ${skipped.connections.toFixed(1)} for the ${skipped.n} who didn't. Their Connect Score averaged ${attended.score.toFixed(1)} against ${skipped.score.toFixed(1)}.`,
    href: '#timing',
  }
}

export function arrivalFinding(scored: readonly ScoredAttendee[], event: EventInfo, t: FindingThresholds): Finding | null {
  const bands = byArrival(scored, event)
  const first = bands[0]
  const last = bands[bands.length - 1]
  if (!first || !last || first === last || last.n < t.minGroupSize) return null
  const diff = round(last.score - first.score)
  if (Math.abs(diff) < t.notableDifference) return null
  // Presence rewards punctuality by design, so look for the biggest gap elsewhere.
  const driver = (['people', 'opportunity', 'visibility'] as AreaKey[])
    .map((area) => ({ area, gap: last.areas[area] - first.areas[area] }))
    .sort((a, b) => a.gap - b.gap)[0]
  return {
    id: 'arrival',
    stat: signed(diff),
    statUnit: 'points for late arrivals',
    headline: `Attendees who arrived ${last.key.toLowerCase()} scored ${Math.abs(diff).toFixed(1)} points ${diff < 0 ? 'lower' : 'higher'} than those who arrived ${first.key.toLowerCase()}.`,
    detail: `Part of the gap is built in, because Presence rewards punctuality. Outside Presence, the biggest gap is ${AREA_LABELS[driver.area]}: ${last.areas[driver.area].toFixed(1)} against ${first.areas[driver.area].toFixed(1)}.`,
    href: '#timing',
  }
}

/** Best group on one measure, if it stands out from the average of all attendees. */
function standout(
  groups: GroupStats[],
  overall: number,
  value: (g: GroupStats) => number,
  t: FindingThresholds,
): { best: GroupStats; gap: number } | null {
  const eligible = groups.filter((g) => g.n >= t.minGroupSize)
  if (eligible.length < 2) return null
  const best = [...eligible].sort((a, b) => value(b) - value(a))[0]
  const gap = round(value(best) - overall)
  return gap >= t.notableDifference ? { best, gap } : null
}

export function roleFinding(scored: readonly ScoredAttendee[], t: FindingThresholds): Finding | null {
  const overall = mean(scored.map((a) => a.areas.opportunity))
  const s = standout(byRole(scored), overall, (g) => g.areas.opportunity, t)
  if (!s) return null
  return {
    id: 'role',
    stat: s.best.areas.opportunity.toFixed(1),
    statUnit: 'Opportunity Capture',
    headline: `${s.best.key} attendees captured the most opportunities.`,
    detail: `They averaged ${s.best.areas.opportunity.toFixed(1)} for Opportunity Capture, ${s.gap.toFixed(1)} points above the average of all attendees (${plural(s.best.n, 'attendee')}).`,
    href: '#comparisons',
  }
}

export function categoryFinding(scored: readonly ScoredAttendee[], t: FindingThresholds): Finding | null {
  const overall = mean(scored.map((a) => a.score))
  const s = standout(byCategory(scored), overall, (g) => g.score, t)
  if (!s) return null
  return {
    id: 'category',
    stat: s.best.score.toFixed(1),
    statUnit: 'average score',
    headline: `${s.best.key}s had the highest average Connect Score.`,
    detail: `${s.best.score.toFixed(1)} on average, ${s.gap.toFixed(1)} points above all attendees.`,
    href: '#comparisons',
  }
}

export function trackFinding(scored: readonly ScoredAttendee[], t: FindingThresholds): Finding | null {
  const tracks = byTrack(scored).filter((g) => g.n >= t.minGroupSize).sort((a, b) => b.score - a.score)
  if (tracks.length < 2) return null
  const best = tracks[0]
  const worst = tracks[tracks.length - 1]
  const diff = round(best.score - worst.score)
  if (diff < t.notableDifference) return null
  return {
    id: 'track',
    stat: signed(diff),
    statUnit: 'points between tracks',
    headline: `The ${best.key} breakout had the highest-scoring attendees.`,
    detail: `They averaged ${best.score.toFixed(1)}, against ${worst.score.toFixed(1)} for ${worst.key}. This shows who chose each track, not that a track caused higher scores.`,
    href: '#comparisons',
  }
}

export function hiddenPotentialFinding(scored: readonly ScoredAttendee[], t: FindingThresholds): Finding | null {
  const people = hiddenPotential(scored, t.hiddenPotential)
  if (people.length === 0) return null
  return {
    id: 'hidden-potential',
    stat: String(people.length),
    statUnit: people.length === 1 ? 'attendee' : 'attendees',
    headline: `${plural(people.length, 'attendee')} networked well but didn't pursue opportunities.`,
    detail: `People Connections of ${t.hiddenPotential.minPeople} or more, but Opportunity Capture under ${t.hiddenPotential.maxOpportunity}. They are the easiest group to move up with a follow-up prompt.`,
    href: null,
  }
}

/** All findings the data currently supports, most important first. */
export function keyFindings(scored: readonly ScoredAttendee[], event: EventInfo, t: FindingThresholds): Finding[] {
  return [
    networkingFinding(scored, t),
    arrivalFinding(scored, event, t),
    roleFinding(scored, t),
    categoryFinding(scored, t),
    trackFinding(scored, t),
    hiddenPotentialFinding(scored, t),
  ].filter((f): f is Finding => f !== null)
}
