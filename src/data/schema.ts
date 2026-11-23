/**
 * Data contract for an event dataset. Every event bundled into ConnectIQ must
 * pass these schemas at build time (scripts/build-data.ts) and in tests, so a
 * malformed spreadsheet export fails loudly instead of producing wrong scores.
 */
import { z } from 'zod'

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM (24h)')

export const CATEGORIES = ['Student', 'Graduate', 'Professional'] as const
export const BREAKOUT_TRACKS = ['AI & Data', 'Fintech & Software', 'Engineering & Innovation'] as const
/** Raw spreadsheet value meaning the attendee left before breakouts. */
export const NO_BREAKOUT = 'Did not attend' as const

const count = z.number().int().min(0)

/** What an attendee did at the event. Only present for people who checked in. */
export const ActivitySchema = z.object({
  checkinTime: hhmm,
  keynote: z.boolean(),
  networking: z.boolean(),
  panel: z.boolean(),
  /** null = left before breakouts ("Did not attend" in the sheet). */
  breakout: z.enum(BREAKOUT_TRACKS).nullable(),
  questions: count,
  connections: count,
  opportunities: count,
  followups: count,
  applied: z.boolean(),
  connectedWithSpeaker: z.boolean(),
  joinedCommunity: z.boolean(),
  postedOnLinkedIn: z.boolean(),
})

export const RegistrantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  gender: z.string().min(1),
  category: z.enum(CATEGORIES),
  role: z.string().min(1),
  yearsExperience: count,
  registrationDate: z.iso.date(),
  /** null = registered but did not check in (no-show). */
  activity: ActivitySchema.nullable(),
})

export const SettingsSchema = z
  .object({
    weights: z.object({
      people: z.number().min(0).max(1),
      opportunity: z.number().min(0).max(1),
      presence: z.number().min(0).max(1),
      visibility: z.number().min(0).max(1),
    }),
    caps: z.object({
      connections: z.number().positive(),
      opportunities: z.number().positive(),
      followups: z.number().positive(),
      questions: z.number().positive(),
    }),
    eventStart: hhmm,
    latestCheckin: hhmm,
    tiers: z.object({ super: z.number(), active: z.number(), emerging: z.number() }),
  })
  .refine((s) => s.eventStart < s.latestCheckin, 'eventStart must be before latestCheckin')
  .refine((s) => s.tiers.super > s.tiers.active && s.tiers.active > s.tiers.emerging, 'tier thresholds must descend')

export const EventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  date: z.iso.date(),
  timezone: z.string(),
  synthetic: z.boolean(),
  schedule: z.array(z.object({ session: z.string(), start: hhmm, end: hhmm.optional() })),
  settings: SettingsSchema,
})

export const EventDatasetSchema = z
  .object({ event: EventSchema, registrants: z.array(RegistrantSchema).min(1) })
  .refine((d) => new Set(d.registrants.map((r) => r.id)).size === d.registrants.length, 'attendee IDs must be unique')

export type Activity = z.infer<typeof ActivitySchema>
export type Registrant = z.infer<typeof RegistrantSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type EventInfo = z.infer<typeof EventSchema>
export type EventDataset = z.infer<typeof EventDatasetSchema>
export type Category = (typeof CATEGORIES)[number]
export type BreakoutTrack = (typeof BREAKOUT_TRACKS)[number]
