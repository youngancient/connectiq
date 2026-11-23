/**
 * CSV export. Pure functions: they build the file's text, and the UI hands it
 * to the browser to download. Nothing leaves the organiser's machine.
 */
import { formatClock, sessionsAttended, type ScoredAttendee } from './scoring'

export type Cell = string | number | boolean | null | undefined

/** Quotes a value when it contains a comma, quote or line break (RFC 4180). */
export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Builds CSV text. Starts with a byte-order mark so Excel reads accented
 * names correctly, and uses CRLF line endings as Excel expects.
 */
export function toCsv(columns: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [columns, ...rows].map((r) => r.map(csvCell).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Every column an organiser might need about one attendee, scores and raw activity. */
export const ATTENDEE_COLUMNS = [
  'Attendee ID', 'Rank', 'Full Name', 'Category', 'STEM Field / Role', 'Connect Score', 'Tier',
  'People Connections', 'Opportunity Capture', 'Presence', 'Visibility',
  'Check-in Time', 'Sessions Attended (of 4)', 'Breakout Track', 'Connections Made', 'Opportunities Explored',
  'Follow-ups Within a Week', 'Applied for an Opportunity', 'Connected with a Speaker', 'Questions Asked',
  'Joined CCI STEM Community', 'Posted on LinkedIn',
] as const

export function attendeeRow(a: ScoredAttendee): Cell[] {
  const x = a.activity
  return [
    a.registrant.id, a.rank, a.registrant.name, a.registrant.category, a.registrant.role, a.score, a.tier,
    a.areas.people, a.areas.opportunity, a.areas.presence, a.areas.visibility,
    formatClock(x.checkinTime), sessionsAttended(x), x.breakout ?? 'Left before breakouts', x.connections, x.opportunities,
    x.followups, x.applied, x.connectedWithSpeaker, x.questions,
    x.joinedCommunity, x.postedOnLinkedIn,
  ]
}

export const attendeesCsv = (list: readonly ScoredAttendee[]) => toCsv(ATTENDEE_COLUMNS, list.map(attendeeRow))

/** Lower-case, hyphenated, safe for a file name. */
export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/**
 * `connectiq-<event>-<what>[-<detail>…][-custom-weights].csv`. The custom-weights
 * suffix stops anyone mistaking re-weighted scores for the default ones.
 */
export function exportFileName(eventId: string, what: string, details: readonly string[], customWeights: boolean): string {
  const parts = ['connectiq', eventId, what, ...details, ...(customWeights ? ['custom-weights'] : [])]
  return parts.map(slug).filter(Boolean).join('-') + '.csv'
}
