/**
 * Aggregate statistics over scored attendees. Pure functions shared by the
 * findings, charts and tables, so their numbers always agree.
 */
import type { EventInfo, Registrant } from '../data/schema'
import { AREAS, formatClock, round, TIERS, toMinutes, type AreaKey, type ScoredAttendee, type Tier } from './scoring'

export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

// ── Headline numbers ────────────────────────────────────────────────────────

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

// ── Group averages ──────────────────────────────────────────────────────────

export interface GroupStats {
  key: string
  n: number
  areas: Record<AreaKey, number>
  score: number
  connections: number
}

/** Averages (1 dp) of each area, the Connect Score and connections for each group. */
export function averageBy(
  scored: readonly ScoredAttendee[],
  keyOf: (a: ScoredAttendee) => string | null,
): GroupStats[] {
  const groups = new Map<string, ScoredAttendee[]>()
  for (const a of scored) {
    const k = keyOf(a)
    if (k === null) continue
    groups.set(k, [...(groups.get(k) ?? []), a])
  }
  return [...groups].map(([key, list]) => ({
    key,
    n: list.length,
    areas: Object.fromEntries(AREAS.map((area) => [area, round(mean(list.map((a) => a.areas[area])))])) as Record<AreaKey, number>,
    score: round(mean(list.map((a) => a.score))),
    connections: round(mean(list.map((a) => a.activity.connections))),
  }))
}

export const byRole = (s: readonly ScoredAttendee[]) => averageBy(s, (a) => a.registrant.role)
export const byCategory = (s: readonly ScoredAttendee[]) => averageBy(s, (a) => a.registrant.category)
/** Breakout tracks only; attendees who left before breakouts are excluded. */
export const byTrack = (s: readonly ScoredAttendee[]) => averageBy(s, (a) => a.activity.breakout)

// ── Arrival and networking ──────────────────────────────────────────────────

export interface ArrivalBand {
  label: string
  /** Inclusive upper bound in minutes after midnight (Infinity for the last band). */
  until: number
}

/**
 * Three bands from the event schedule: on time (by the keynote), during the
 * keynote, and at or after the start of networking.
 */
export function arrivalBands(event: EventInfo): ArrivalBand[] {
  const start = toMinutes(event.settings.eventStart)
  const networking = event.schedule.find((s) => /network/i.test(s.session))
  const late = networking ? toMinutes(networking.start) : start + 45
  return [
    { label: `By ${formatClock(start)}`, until: start },
    { label: `${formatClock(start + 1)}–${formatClock(late - 1)}`, until: late - 1 },
    { label: `${formatClock(late)} or later`, until: Infinity },
  ]
}

export function byArrival(scored: readonly ScoredAttendee[], event: EventInfo): GroupStats[] {
  const bands = arrivalBands(event)
  const stats = averageBy(scored, (a) => bands.find((b) => toMinutes(a.activity.checkinTime) <= b.until)!.label)
  return bands.flatMap((b) => stats.filter((s) => s.key === b.label))
}

export function byNetworking(scored: readonly ScoredAttendee[]): { attended: GroupStats | undefined; skipped: GroupStats | undefined } {
  const stats = averageBy(scored, (a) => (a.activity.networking ? 'attended' : 'skipped'))
  return { attended: stats.find((s) => s.key === 'attended'), skipped: stats.find((s) => s.key === 'skipped') }
}

/** Good networkers who didn't pursue opportunities: candidates for a nudge. */
export function hiddenPotential(
  scored: readonly ScoredAttendee[],
  t: { minPeople: number; maxOpportunity: number },
): ScoredAttendee[] {
  return scored.filter((a) => a.areas.people >= t.minPeople && a.areas.opportunity < t.maxOpportunity)
}

// ── Tier mix ────────────────────────────────────────────────────────────────

export function tierCounts(scored: readonly ScoredAttendee[]): Record<Tier, number> {
  const counts = Object.fromEntries(TIERS.map((t) => [t, 0])) as Record<Tier, number>
  for (const a of scored) counts[a.tier]++
  return counts
}

export function tierMixBy(
  scored: readonly ScoredAttendee[],
  keyOf: (a: ScoredAttendee) => string,
): { key: string; n: number; counts: Record<Tier, number> }[] {
  const keys = [...new Set(scored.map(keyOf))]
  return keys.map((key) => {
    const list = scored.filter((a) => keyOf(a) === key)
    return { key, n: list.length, counts: tierCounts(list) }
  })
}

// ── Wording ─────────────────────────────────────────────────────────────────

/** Neutral comparison wording: small gaps are "slightly", never overstated. */
export function describeDifference(diff: number, notable: number): string {
  const size = Math.abs(diff)
  if (size < notable / 5) return 'about the same as'
  const dir = diff > 0 ? 'higher than' : 'lower than'
  return size < notable ? `slightly ${dir}` : dir
}
