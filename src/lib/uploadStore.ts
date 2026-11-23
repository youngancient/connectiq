/**
 * Keeps uploaded editions in this browser only (localStorage), so a refresh
 * doesn't lose them and the data never leaves the organiser's machine.
 * Storage can be blocked or full; every call fails safely and reports it.
 */
import { EventDatasetSchema, type EventDataset } from '../data/schema'

const KEY = 'connectiq-uploads-v1'

/** Returns saved editions, dropping any that no longer pass validation. */
export function loadStoredEditions(): EventDataset[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.flatMap((item) => {
      const r = EventDatasetSchema.safeParse(item)
      return r.success ? [r.data] : []
    })
  } catch {
    return []
  }
}

/** Saves editions; returns false when the browser refuses (private mode, storage full). */
export function saveStoredEditions(list: readonly EventDataset[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}
