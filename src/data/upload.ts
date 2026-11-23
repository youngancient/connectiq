/**
 * Reading an organiser's uploaded attendee spreadsheet (CSV).
 *
 * Unlike the build script, which stops at the first bad row, an upload checks
 * every row on its own: valid rows are kept, and each problem is reported with
 * its line and field so the organiser can fix the file or carry on without them.
 * Pure functions, no browser APIs, so all of it is unit-tested.
 */
import { COLUMNS, normaliseTime, parseCsv } from './csv'
import {
  BREAKOUT_TRACKS, CATEGORIES, EventDatasetSchema, NO_BREAKOUT, RegistrantSchema,
  type EventDataset, type EventInfo, type Registrant, type Settings,
} from './schema'

/** Refuse files that are clearly not an event export, before parsing them. */
export const UPLOAD_LIMITS = { maxBytes: 2 * 1024 * 1024, maxRows: 5000 } as const

export interface RowError {
  /** Line in the file (the header is line 1). */
  line: number
  /** Attendee ID or name when the row has one, to help find it. */
  who: string | null
  message: string
}

export type ParseResult =
  | { ok: true; registrants: Registrant[]; errors: RowError[]; totalRows: number }
  | { ok: false; reason: string }

type Column = (typeof COLUMNS)[number]

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** "yes" / "No" / " YES " → boolean; anything else is an error. */
function yesNo(v: string): boolean | null {
  const n = norm(v)
  return n === 'yes' ? true : n === 'no' ? false : null
}

/** 2026-11-15, 15/11/2026 or 15-11-2026 → 2026-11-15 (day first, as in Nigeria). */
export function normaliseDate(v: string): string | null {
  const s = v.trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else if ((match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Reads the uploaded text. Returns the valid registrants and every problem found. */
export function parseAttendeesUpload(text: string): ParseResult {
  if (text.length > UPLOAD_LIMITS.maxBytes) return { ok: false, reason: 'The file is larger than 2 MB, which is far more than an event export should be.' }
  const rows = parseCsv(text.replace(/^﻿/, ''))
  if (rows.length === 0) return { ok: false, reason: 'The file is empty.' }

  // Match headers ignoring case and extra spaces, so small export differences don't matter.
  const header = rows[0].map(norm)
  const idx = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(norm(c))])) as Record<Column, number>
  const missing = COLUMNS.filter((c) => idx[c] === -1)
  if (missing.length > 5) {
    return {
      ok: false,
      reason: `This doesn't look like a CCI STEM Connect attendee export: ${missing.length} of the ${COLUMNS.length} expected columns are missing. Download the template to see the expected columns.`,
    }
  }
  if (missing.length) {
    return {
      ok: false,
      reason: `The file is missing ${missing.length === 1 ? 'a column' : `${missing.length} columns`}: ${missing.join(', ')}. Check the column headings against the template.`,
    }
  }

  const body = rows.slice(1)
  if (body.length === 0) return { ok: false, reason: 'The file has column headings but no attendee rows.' }
  if (body.length > UPLOAD_LIMITS.maxRows) return { ok: false, reason: `The file has ${body.length} rows; the limit is ${UPLOAD_LIMITS.maxRows}.` }

  const registrants: Registrant[] = []
  const errors: RowError[] = []
  const seenIds = new Map<string, number>()

  body.forEach((cells, i) => {
    const line = i + 2
    const get = (c: Column) => (cells[idx[c]] ?? '').trim()
    const problems: string[] = []
    const need = (c: Column) => { if (!get(c)) problems.push(`"${c}" is empty`) }

    const yn = (c: Column) => {
      const v = yesNo(get(c))
      if (v === null) problems.push(`"${c}" must be Yes or No${get(c) ? `, got "${get(c)}"` : ' but is empty'}`)
      return v ?? false
    }
    const count = (c: Column) => {
      const raw = get(c)
      const n = Number(raw)
      if (raw === '' || !Number.isInteger(n) || n < 0) {
        problems.push(`"${c}" must be a whole number of 0 or more${raw ? `, got "${raw}"` : ' but is empty'}`)
        return 0
      }
      return n
    }

    const id = get('Attendee ID')
    const name = get('Full Name')
    need('Attendee ID'); need('Full Name'); need('Gender'); need('STEM Field / Role')
    if (id) {
      const first = seenIds.get(id)
      if (first) problems.push(`Attendee ID "${id}" is already used on line ${first}`)
      else seenIds.set(id, line)
    }

    const category = CATEGORIES.find((c) => norm(c) === norm(get('Category')))
    if (!category) problems.push(`"Category" must be ${CATEGORIES.join(', ')}; got "${get('Category')}"`)

    const registrationDate = normaliseDate(get('Registration Date'))
    if (!registrationDate) problems.push(`"Registration Date" must be a date such as 2026-11-15 or 15/11/2026; got "${get('Registration Date')}"`)

    const base = {
      id, name, gender: get('Gender'), category: category ?? 'Student', role: get('STEM Field / Role'),
      yearsExperience: count('Years of Experience'), registrationDate: registrationDate ?? '',
    }

    let registrant: Registrant | null = null
    const checkedIn = yn('Checked In')
    if (!checkedIn) {
      registrant = { ...base, activity: null }
    } else {
      const time = normaliseTime(get('Check-in Time'))
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        problems.push(`"Check-in Time" must be a time such as 14:25 or 2:25 PM${get('Check-in Time') ? `; got "${get('Check-in Time')}"` : ' but is empty'}`)
      }
      const rawTrack = get('Breakout Track')
      const left = [norm(NO_BREAKOUT), 'left before breakouts'].includes(norm(rawTrack))
      const track = BREAKOUT_TRACKS.find((t) => norm(t) === norm(rawTrack))
      if (!left && !track) problems.push(`"Breakout Track" must be ${BREAKOUT_TRACKS.join(', ')} or "${NO_BREAKOUT}"; got "${rawTrack}"`)
      registrant = {
        ...base,
        activity: {
          checkinTime: time,
          keynote: yn('Attended Keynote'),
          networking: yn('Attended Networking'),
          panel: yn('Attended Panel'),
          breakout: left ? null : (track ?? null),
          questions: count('Questions Asked'),
          connections: count('Connections Made'),
          opportunities: count('Opportunities Explored'),
          followups: count('Follow-ups Within a Week'),
          applied: yn('Applied for an Opportunity'),
          connectedWithSpeaker: yn('Connected with a Speaker'),
          joinedCommunity: yn('Joined CCI STEM Community'),
          postedOnLinkedIn: yn('Posted on LinkedIn'),
        },
      }
    }

    // Final safety net: the same schema the build uses must accept the row.
    if (problems.length === 0) {
      const check = RegistrantSchema.safeParse(registrant)
      if (!check.success) problems.push(...check.error.issues.map((x) => `${x.path.join('.') || 'row'}: ${x.message}`))
    }

    if (problems.length) errors.push(...problems.map((message) => ({ line, who: id || name || null, message })))
    else registrants.push(registrant)
  })

  return { ok: true, registrants, errors, totalRows: body.length }
}

export interface UploadDetails {
  name: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM, 24-hour */
  keynote: string
  /** HH:MM, 24-hour */
  networking: string
}

/** Punctuality credit runs out this long after the keynote starts (as at the 2026 edition: 2:30pm → 3:45pm). */
export const LATE_WINDOW_MINUTES = 75

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toHm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** A sensible default event date: the day after the latest registration. */
export function suggestedDate(registrants: readonly Registrant[]): string {
  const latest = registrants.map((r) => r.registrationDate).filter(Boolean).sort().at(-1)
  if (!latest) return new Date().toISOString().slice(0, 10)
  const d = new Date(`${latest}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Turns "cci-stem-connect-2025-sample.csv" into "CCI STEM Connect 2025". */
export function suggestedName(fileName: string): string {
  const words = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b(sample|with errors|template|export|attendees?)\b/gi, '').trim()
  const titled = words.split(/\s+/).filter(Boolean).map((w) => (/^(cci|stem)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  return titled.join(' ') || 'Uploaded event'
}

/**
 * Builds an edition from an upload. Scoring uses the same weights, caps and
 * tiers as the bundled model, so editions are scored the same way.
 */
export function buildUploadedEvent(details: UploadDetails, registrants: Registrant[], model: Settings): EventDataset {
  const slug = details.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event'
  const event: EventInfo = {
    id: `upload-${slug}-${details.date}`,
    name: details.name.trim(),
    date: details.date,
    timezone: 'Africa/Lagos',
    synthetic: false,
    schedule: [
      { session: 'Keynote', start: details.keynote },
      { session: 'Networking', start: details.networking },
    ],
    settings: { ...model, eventStart: details.keynote, latestCheckin: toHm(toMin(details.keynote) + LATE_WINDOW_MINUTES) },
  }
  return EventDatasetSchema.parse({ event, registrants })
}

/** Checks the event form; returns a message per field that needs fixing. */
export function validateDetails(d: UploadDetails): Partial<Record<keyof UploadDetails, string>> {
  const out: Partial<Record<keyof UploadDetails, string>> = {}
  if (!d.name.trim()) out.name = 'Give the event a name.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !normaliseDate(d.date)) out.date = 'Choose the event date.'
  if (!/^\d{2}:\d{2}$/.test(d.keynote)) out.keynote = 'Enter the keynote start time.'
  if (!/^\d{2}:\d{2}$/.test(d.networking)) out.networking = 'Enter the networking start time.'
  else if (!out.keynote && toMin(d.networking) <= toMin(d.keynote)) out.networking = 'Networking should start after the keynote.'
  return out
}
