import { describe, expect, it } from 'vitest'
import { loadEvent } from '../data/events'
import { parseCsv } from '../data/csv'
import { ATTENDEE_COLUMNS, attendeesCsv, csvCell, exportFileName, toCsv } from './export'
import { scoreAll } from './scoring'

const { event, registrants } = loadEvent()
const scored = scoreAll(registrants, event.settings)

describe('csv', () => {
  it('quotes only when needed', () => {
    expect(csvCell('Tech')).toBe('Tech')
    expect(csvCell('Science, Tech')).toBe('"Science, Tech"')
    expect(csvCell('She said "hi"')).toBe('"She said ""hi"""')
    expect(csvCell(true)).toBe('Yes')
    expect(csvCell(null)).toBe('')
    expect(csvCell(67.8)).toBe('67.8')
  })

  it('starts with a byte-order mark and uses CRLF', () => {
    const csv = toCsv(['A', 'B'], [[1, 2]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿A,B\r\n1,2\r\n')
  })
})

describe('attendee export', () => {
  const rows = parseCsv(attendeesCsv(scored).replace(/^﻿/, ''))

  it('has a header and one row per attendee', () => {
    expect(rows[0]).toEqual([...ATTENDEE_COLUMNS])
    expect(rows).toHaveLength(scored.length + 1)
  })

  it('matches what the dashboard shows', () => {
    const row = rows.find((r) => r[0] === 'CCI-002')!
    const col = (name: (typeof ATTENDEE_COLUMNS)[number]) => row[ATTENDEE_COLUMNS.indexOf(name)]
    expect(col('Full Name')).toBe('Obinna Okeke')
    expect(col('Connect Score')).toBe('67.8')
    expect(col('Tier')).toBe('Active Connector')
    expect(col('Check-in Time')).toBe('2:39pm')
    expect(col('Applied for an Opportunity')).toBe('No')
  })

  it('round-trips a name with a comma', () => {
    const a = { ...scored[0], registrant: { ...scored[0].registrant, name: 'Okeke, Obinna' } }
    expect(parseCsv(attendeesCsv([a]).replace(/^﻿/, ''))[1][2]).toBe('Okeke, Obinna')
  })
})

describe('file names', () => {
  it('describes the export and flags custom weights', () => {
    expect(exportFileName('cci-stem-connect-2026', 'leaderboard', ['Super Connector', 'Student'], false))
      .toBe('connectiq-cci-stem-connect-2026-leaderboard-super-connector-student.csv')
    expect(exportFileName('cci-stem-connect-2026', 'full results', [], true))
      .toBe('connectiq-cci-stem-connect-2026-full-results-custom-weights.csv')
  })
})
