/**
 * Converts a spreadsheet CSV export (the "Attendees" tab layout) into typed
 * registrant records. Pure and dependency-free so it runs in Node (build script)
 * and in tests.
 */
import { NO_BREAKOUT, type Registrant } from './schema'

/** Column headers exactly as they appear in the spreadsheet. */
export const COLUMNS = [
  'Attendee ID', 'Full Name', 'Gender', 'Category', 'STEM Field / Role', 'Years of Experience',
  'Registration Date', 'Checked In', 'Check-in Time', 'Attended Keynote', 'Attended Networking',
  'Attended Panel', 'Breakout Track', 'Questions Asked', 'Connections Made', 'Opportunities Explored',
  'Follow-ups Within a Week', 'Applied for an Opportunity', 'Connected with a Speaker',
  'Joined CCI STEM Community', 'Posted on LinkedIn',
] as const

type Column = (typeof COLUMNS)[number]

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

const yesNo = (v: string, col: Column, line: number): boolean => {
  if (v === 'Yes') return true
  if (v === 'No') return false
  throw new Error(`Line ${line}: "${col}" must be Yes or No, got "${v}"`)
}

const int = (v: string, col: Column, line: number): number => {
  const n = Number(v)
  if (v.trim() === '' || !Number.isInteger(n)) throw new Error(`Line ${line}: "${col}" must be a whole number, got "${v}"`)
  return n
}

/** Accepts 13:05, 13:05:00 or 1:05 PM and returns 24h HH:MM. */
export function normaliseTime(v: string): string {
  const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)
  if (!m) return v
  let h = Number(m[1])
  const ampm = m[3]?.toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/**
 * Turns CSV text into registrants. Values are converted but not range-checked;
 * run the result through EventDatasetSchema for full validation.
 */
export function registrantsFromCsv(text: string): unknown[] {
  const [header, ...body] = parseCsv(text)
  const missing = COLUMNS.filter((c) => !header.includes(c))
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}`)
  const idx = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<Column, number>

  return body.map((cells, i) => {
    const line = i + 2
    const get = (c: Column) => (cells[idx[c]] ?? '').trim()
    const checkedIn = yesNo(get('Checked In'), 'Checked In', line)
    const breakout = get('Breakout Track')
    const base: Omit<Registrant, 'activity'> = {
      id: get('Attendee ID'),
      name: get('Full Name'),
      gender: get('Gender'),
      category: get('Category') as Registrant['category'],
      role: get('STEM Field / Role'),
      yearsExperience: int(get('Years of Experience'), 'Years of Experience', line),
      registrationDate: get('Registration Date'),
    }
    if (!checkedIn) return { ...base, activity: null }
    return {
      ...base,
      activity: {
        checkinTime: normaliseTime(get('Check-in Time')),
        keynote: yesNo(get('Attended Keynote'), 'Attended Keynote', line),
        networking: yesNo(get('Attended Networking'), 'Attended Networking', line),
        panel: yesNo(get('Attended Panel'), 'Attended Panel', line),
        breakout: breakout === NO_BREAKOUT ? null : breakout,
        questions: int(get('Questions Asked'), 'Questions Asked', line),
        connections: int(get('Connections Made'), 'Connections Made', line),
        opportunities: int(get('Opportunities Explored'), 'Opportunities Explored', line),
        followups: int(get('Follow-ups Within a Week'), 'Follow-ups Within a Week', line),
        applied: yesNo(get('Applied for an Opportunity'), 'Applied for an Opportunity', line),
        connectedWithSpeaker: yesNo(get('Connected with a Speaker'), 'Connected with a Speaker', line),
        joinedCommunity: yesNo(get('Joined CCI STEM Community'), 'Joined CCI STEM Community', line),
        postedOnLinkedIn: yesNo(get('Posted on LinkedIn'), 'Posted on LinkedIn', line),
      },
    }
  })
}
