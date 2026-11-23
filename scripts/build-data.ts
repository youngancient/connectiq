/**
 * Builds the bundled JSON for every event in data/<event-id>/.
 *
 *   data/<event-id>/event.json      event name, schedule and scoring settings
 *   data/<event-id>/attendees.csv   the spreadsheet's Attendees tab, exported as CSV
 *
 * Output: src/data/events/<event-id>.json (validated; the build fails on bad data).
 * Usage:  npm run data
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { registrantsFromCsv } from '../src/data/csv.ts'
import { EventDatasetSchema } from '../src/data/schema.ts'

const root = join(import.meta.dirname, '..')
const dataDir = join(root, 'data')
const outDir = join(root, 'src', 'data', 'events')
mkdirSync(outDir, { recursive: true })

let failed = false
for (const id of readdirSync(dataDir)) {
  const dir = join(dataDir, id)
  if (!existsSync(join(dir, 'event.json'))) continue
  try {
    const event = JSON.parse(readFileSync(join(dir, 'event.json'), 'utf8'))
    const registrants = registrantsFromCsv(readFileSync(join(dir, 'attendees.csv'), 'utf8'))
    const result = EventDatasetSchema.safeParse({ event, registrants })
    if (!result.success) {
      failed = true
      console.error(`✗ ${id}: invalid data`)
      for (const issue of result.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
      continue
    }
    writeFileSync(join(outDir, `${id}.json`), JSON.stringify(result.data, null, 2) + '\n')
    const attended = result.data.registrants.filter((r) => r.activity).length
    console.log(`✓ ${id}: ${result.data.registrants.length} registrants, ${attended} checked in`)
  } catch (err) {
    failed = true
    console.error(`✗ ${id}: ${(err as Error).message}`)
  }
}
process.exit(failed ? 1 : 0)
