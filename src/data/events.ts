/**
 * The single entry point the UI uses to get data. Events are bundled JSON
 * produced by `npm run data`; to serve data from an API later, change only this file.
 */
import cci from './events/cci-stem-connect-2026.json'
import { EventDatasetSchema, type EventDataset } from './schema'

const BUNDLED: Record<string, unknown> = {
  'cci-stem-connect-2026': cci,
}

export const DEFAULT_EVENT_ID = 'cci-stem-connect-2026'

export function listEvents(): string[] {
  return Object.keys(BUNDLED)
}

/** Loads and validates an event. Throws a readable error if the data is invalid. */
export function loadEvent(id: string = DEFAULT_EVENT_ID): EventDataset {
  const raw = BUNDLED[id]
  if (!raw) throw new Error(`Unknown event "${id}"`)
  return EventDatasetSchema.parse(raw)
}
