/**
 * Ask the Data: a fixed set of questions, each answered by a pure function of
 * the data. Nothing is generated, so an answer can't invent a number.
 * To add a question, add an entry here; the UI renders whatever is listed.
 */
import { THRESHOLDS } from '../../config/site'
import type { EventInfo, Registrant } from '../../data/schema'
import { byArrival, hiddenPotential } from '../analytics'
import type { ScoredAttendee } from '../scoring'

export type QuestionGroup = 'People' | 'Opportunities' | 'Attendance'
export type QuestionId =
  | 'top-connectors' | 'hidden-potential' | 'speaker' | 'applied' | 'questions' | 'no-shows' | 'late-arrivals'

export interface AnswerContext {
  scored: readonly ScoredAttendee[]
  registrants: readonly Registrant[]
  event: EventInfo
}

export interface AnswerTable {
  columns: string[]
  rows: (string | number)[][]
  numeric?: boolean[]
  /** Attendee id for each row, when the first column is a name that opens a profile. */
  ids?: string[]
}

export interface Answer {
  sentence: string
  table?: AnswerTable
  /** How the answer was worked out, shown under "How this was calculated". */
  method: { filter: string; formula: string; n: number }
}

export interface Question {
  id: QuestionId
  group: QuestionGroup
  text: string
  answer: (ctx: AnswerContext) => Answer
}

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '0%')
const people = (n: number) => `${n} ${n === 1 ? 'attendee' : 'attendees'}`
const nobody = (sentence = 'Nobody checked in to this event, so there is nothing to show.'): Answer => ({
  sentence,
  method: { filter: 'Attendees who checked in', formula: 'None found', n: 0 },
})
const ids = (list: readonly ScoredAttendee[]) => list.map((a) => a.registrant.id)

export const QUESTIONS: readonly Question[] = [
  {
    id: 'top-connectors',
    group: 'People',
    text: 'Who are the top 5 connectors?',
    answer: ({ scored }) => {
      const top = scored.slice(0, 5)
      if (top.length === 0) return nobody()
      return {
        sentence: `${top[0].registrant.name} leads with a Connect Score of ${top[0].score.toFixed(1)}${top[1]?.rank === 1 ? `, tied with ${top[1].registrant.name}` : ''}.`,
        table: {
          columns: ['Name', 'Rank', 'Score', 'Tier'],
          rows: top.map((a) => [a.registrant.name, a.rank, a.score.toFixed(1), a.tier]),
          numeric: [false, true, true, false],
          ids: ids(top),
        },
        method: { filter: 'Attendees who checked in', formula: 'Sorted by Connect Score at the current weights; ties share a rank', n: scored.length },
      }
    },
  },
  {
    id: 'hidden-potential',
    group: 'People',
    text: 'Who has hidden potential?',
    answer: ({ scored }) => {
      const t = THRESHOLDS.hiddenPotential
      const list = hiddenPotential(scored, t).sort((a, b) => b.areas.people - a.areas.people)
      const applied = list.filter((a) => a.activity.applied).length
      return {
        sentence: list.length
          ? `${people(list.length)} networked well but didn't pursue opportunities${applied === 0 ? ', and none of them applied for one' : ''}. A follow-up prompt could move them up.`
          : 'No attendee currently combines strong networking with low opportunity capture.',
        table: list.length ? {
          columns: ['Name', 'Role', 'People Connections', 'Opportunity Capture', 'Opportunities explored'],
          rows: list.map((a) => [a.registrant.name, a.registrant.role, a.areas.people.toFixed(1), a.areas.opportunity.toFixed(1), a.activity.opportunities]),
          numeric: [false, false, true, true, true],
          ids: ids(list),
        } : undefined,
        method: { filter: `People Connections of ${t.minPeople} or more and Opportunity Capture under ${t.maxOpportunity}`, formula: 'Matching attendees, strongest networkers first', n: scored.length },
      }
    },
  },
  {
    id: 'speaker',
    group: 'People',
    text: 'How many connected with a speaker?',
    answer: ({ scored }) => {
      const list = scored.filter((a) => a.activity.connectedWithSpeaker)
      return {
        sentence: `${people(list.length)} connected with a speaker, ${pct(list.length, scored.length)} of everyone who came.`,
        table: {
          columns: ['Name', 'Role', 'Score'],
          rows: list.map((a) => [a.registrant.name, a.registrant.role, a.score.toFixed(1)]),
          numeric: [false, false, true],
          ids: ids(list),
        },
        method: { filter: 'Attendees who checked in', formula: 'Count where Connected with a Speaker = Yes', n: scored.length },
      }
    },
  },
  {
    id: 'applied',
    group: 'Opportunities',
    text: 'Who applied for an opportunity?',
    answer: ({ scored }) => {
      const list = scored.filter((a) => a.activity.applied)
      return {
        sentence: `${people(list.length)} applied for an opportunity shared at the event, ${pct(list.length, scored.length)} of everyone who came.`,
        table: {
          columns: ['Name', 'Category', 'Opportunities explored', 'Score'],
          rows: list.map((a) => [a.registrant.name, a.registrant.category, a.activity.opportunities, a.score.toFixed(1)]),
          numeric: [false, false, true, true],
          ids: ids(list),
        },
        method: { filter: 'Attendees who checked in', formula: 'Count where Applied for an Opportunity = Yes', n: scored.length },
      }
    },
  },
  {
    id: 'questions',
    group: 'Attendance',
    text: 'Who asked questions?',
    answer: ({ scored }) => {
      const list = scored.filter((a) => a.activity.questions > 0).sort((a, b) => b.activity.questions - a.activity.questions)
      const total = list.reduce((n, a) => n + a.activity.questions, 0)
      return {
        sentence: `Only ${people(list.length)} asked questions, ${total} in total. That is ${pct(list.length, scored.length)} of the room.`,
        table: {
          columns: ['Name', 'Questions', 'Role'],
          rows: list.map((a) => [a.registrant.name, a.activity.questions, a.registrant.role]),
          numeric: [false, true, false],
          ids: ids(list),
        },
        method: { filter: 'Attendees who checked in', formula: 'Attendees with Questions Asked above 0, most first', n: scored.length },
      }
    },
  },
  {
    id: 'no-shows',
    group: 'Attendance',
    text: "How many registered people didn't show up?",
    answer: ({ scored, registrants }) => {
      const noShows = registrants.length - scored.length
      return {
        sentence: `${noShows} of the ${registrants.length} people who registered didn't come. ${scored.length} checked in, a show-up rate of ${pct(scored.length, registrants.length)}.`,
        table: {
          columns: ['', 'People', 'Share'],
          rows: [
            ['Registered', registrants.length, '100%'],
            ['Checked in', scored.length, pct(scored.length, registrants.length)],
            ["Didn't show up", noShows, pct(noShows, registrants.length)],
          ],
          numeric: [false, true, true],
        },
        method: { filter: 'Every registration', formula: 'Registrations minus check-ins', n: registrants.length },
      }
    },
  },
  {
    id: 'late-arrivals',
    group: 'Attendance',
    text: 'Did late arrivals connect less?',
    answer: ({ scored, event }) => {
      const bands = byArrival(scored, event)
      if (bands.length < 2) return nobody('There are not enough check-ins to compare arrival times.')
      const first = bands[0]
      const last = bands[bands.length - 1]
      const gap = first.connections - last.connections
      const verdict =
        Math.abs(gap) < THRESHOLDS.notableConnections
          ? `Only slightly: ${last.connections.toFixed(1)} connections against ${first.connections.toFixed(1)} for those on time`
          : gap > 0
            ? `Yes: ${last.connections.toFixed(1)} connections against ${first.connections.toFixed(1)} for those on time`
            : `No: they made ${last.connections.toFixed(1)} connections against ${first.connections.toFixed(1)} for those on time`
      return {
        sentence: `${verdict}. Their Connect Score was lower, ${last.score.toFixed(1)} against ${first.score.toFixed(1)}, partly because Presence rewards punctuality.`,
        table: {
          columns: ['Arrived', 'People', 'Avg connections', 'Avg score'],
          rows: bands.map((b) => [b.key, b.n, b.connections.toFixed(1), b.score.toFixed(1)]),
          numeric: [false, true, true, true],
        },
        method: { filter: 'Attendees who checked in, grouped by check-in time', formula: 'Average connections and Connect Score in each group', n: scored.length },
      }
    },
  },
]

export const GROUPS: readonly QuestionGroup[] = ['People', 'Opportunities', 'Attendance']
