import { describe, expect, it } from 'vitest'
import attendees2026 from '../../data/cci-stem-connect-2026/attendees.csv?raw'
import sample2025 from '../../public/samples/cci-stem-connect-2025-sample.csv?raw'
import broken2025 from '../../public/samples/cci-stem-connect-2025-with-errors.csv?raw'
import template from '../../public/samples/connectiq-template.csv?raw'
import { scoreAll } from '../engine/scoring'
import { loadEvent } from './events'
import {
  buildUploadedEvent, normaliseDate, parseAttendeesUpload, suggestedDate, suggestedName, validateDetails,
} from './upload'

const demo = loadEvent()
const details = { name: 'CCI STEM Connect 2026', date: '2026-11-22', keynote: '14:30', networking: '15:15' }
const ok = (text: string) => {
  const r = parseAttendeesUpload(text)
  if (!r.ok) throw new Error(r.reason)
  return r
}

describe('uploading the 2026 export', () => {
  const r = ok(attendees2026)

  it('reads every row with no errors', () => {
    expect(r.errors).toEqual([])
    expect(r.registrants).toHaveLength(361)
    expect(r.totalRows).toBe(361)
  })

  it('reproduces the dashboard’s scores exactly', () => {
    const uploaded = buildUploadedEvent(details, r.registrants, demo.event.settings)
    const a = scoreAll(uploaded.registrants, uploaded.event.settings)
    const b = scoreAll(demo.registrants, demo.event.settings)
    expect(a.map((x) => [x.registrant.id, x.score, x.tier, x.rank])).toEqual(b.map((x) => [x.registrant.id, x.score, x.tier, x.rank]))
  })

  it('sets punctuality from the keynote time', () => {
    const uploaded = buildUploadedEvent(details, r.registrants, demo.event.settings)
    expect(uploaded.event.settings.eventStart).toBe('14:30')
    expect(uploaded.event.settings.latestCheckin).toBe('15:45')
    expect(uploaded.event.id).toBe('upload-cci-stem-connect-2026-2026-11-22')
  })
})

describe('the sample files', () => {
  it('the 2025 sample loads cleanly', () => {
    const r = ok(sample2025)
    expect(r.errors).toEqual([])
    expect(r.registrants).toHaveLength(280)
    expect(r.registrants.filter((x) => x.activity)).toHaveLength(120)
  })

  it('the broken file reports each mistake and keeps the good rows', () => {
    const r = ok(broken2025)
    const messages = r.errors.map((e) => e.message)
    expect(messages).toEqual(expect.arrayContaining([
      expect.stringContaining('"Checked In" must be Yes or No, got "Maybe"'),
      expect.stringContaining('"Check-in Time" must be a time such as 14:25 or 2:25 PM but is empty'),
      expect.stringContaining('"Breakout Track" must be Science, Tech, Engineering, Maths'),
      expect.stringContaining('"Category" must be Student, Graduate, Professional; got "Postgraduate"'),
      expect.stringContaining('"Connections Made" must be a whole number of 0 or more, got "lots"'),
      expect.stringContaining('got "25:10"'),
      expect.stringContaining('is already used on line'),
    ]))
    expect(r.errors).toHaveLength(7)
    expect(r.registrants).toHaveLength(280 - 7)
    expect(r.errors.every((e) => e.line >= 2 && e.who)).toBe(true)
  })

  it('the template loads one attendee and one no-show', () => {
    const r = ok(template)
    expect(r.errors).toEqual([])
    expect(r.registrants.map((x) => Boolean(x.activity))).toEqual([true, false])
  })
})

describe('forgiving but strict', () => {
  const header = attendees2026.split('\n')[0]
  const row = attendees2026.split('\n')[2] // CCI-002, checked in

  it('accepts case, spacing, day-first dates, 12-hour times and "Left before breakouts"', () => {
    expect(row).toContain('Yes,14:39,')
    const messy = row
      .replace('Yes,14:39,', 'yes,2:39 PM,')
      .replace('2026-11-15', '15/11/2026')
      .replace(/,(Science|Tech|Engineering|Maths),/, ',Left before breakouts,')
    expect(messy).not.toBe(row)
    const r = ok(`${header.toUpperCase()}\n${messy}`)
    expect(r.errors).toEqual([])
    expect(r.registrants[0].activity?.checkinTime).toBe('14:39')
    expect(r.registrants[0].registrationDate).toBe('2026-11-15')
    expect(r.registrants[0].activity?.breakout).toBeNull()
  })

  it('refuses files that are not an attendee export', () => {
    expect(parseAttendeesUpload('')).toEqual({ ok: false, reason: 'The file is empty.' })
    expect(parseAttendeesUpload(header).ok).toBe(false)
    const r = parseAttendeesUpload('Name,Email\nAda,ada@example.com')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain("doesn't look like a CCI STEM Connect attendee export: 21 of the 21")
    const oneMissing = parseAttendeesUpload(attendees2026.replace('Posted on LinkedIn', 'LinkedIn post'))
    expect(oneMissing.ok).toBe(false)
    if (!oneMissing.ok) expect(oneMissing.reason).toBe('The file is missing a column: Posted on LinkedIn. Check the column headings against the template.')
    expect(parseAttendeesUpload('x'.repeat(3 * 1024 * 1024)).ok).toBe(false)
  })

  it('reads dates both ways and rejects impossible ones', () => {
    expect(normaliseDate('2026-11-05')).toBe('2026-11-05')
    expect(normaliseDate('5/11/2026')).toBe('2026-11-05')
    expect(normaliseDate('31/02/2026')).toBeNull()
    expect(normaliseDate('next week')).toBeNull()
  })
})

describe('event details', () => {
  it('suggests a name from the file and a date after the last registration', () => {
    expect(suggestedName('cci-stem-connect-2025-sample.csv')).toBe('CCI STEM Connect 2025')
    expect(suggestedName('cci-stem-connect-2025-with-errors.csv')).toBe('CCI STEM Connect 2025')
    expect(suggestedDate(ok(sample2025).registrants)).toBe('2025-11-21')
  })

  it('checks the form', () => {
    expect(validateDetails(details)).toEqual({})
    expect(validateDetails({ ...details, name: ' ', networking: '14:00' })).toEqual({
      name: 'Give the event a name.',
      networking: 'Networking should start after the keynote.',
    })
  })
})
