/**
 * Dashboard state: the editable settings and everything derived from them.
 * Scores are recomputed with useMemo whenever settings change (150 rows: well under 1 ms).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { EventDataset, Settings } from '../data/schema'
import { scoreAll, type ScoredAttendee } from '../engine/scoring'

interface DashboardState {
  event: EventDataset['event']
  registrants: EventDataset['registrants']
  defaults: Settings
  settings: Settings
  setSettings: (s: Settings) => void
  resetSettings: () => void
  isDefault: boolean
  scored: ScoredAttendee[]
  /** Rank of each attendee under the default settings, for ▲/▼ markers. */
  baselineRank: ReadonlyMap<string, number>
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

const Ctx = createContext<DashboardState | null>(null)

export function DashboardProvider({ dataset, children }: { dataset: EventDataset; children: ReactNode }) {
  const defaults = dataset.event.settings
  const [settings, setSettings] = useState<Settings>(defaults)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const baselineRank = useMemo(
    () => new Map(scoreAll(dataset.registrants, defaults).map((a) => [a.registrant.id, a.rank])),
    [dataset, defaults],
  )
  const scored = useMemo(() => scoreAll(dataset.registrants, settings), [dataset, settings])
  const resetSettings = useCallback(() => setSettings(defaults), [defaults])

  const value = useMemo<DashboardState>(
    () => ({
      event: dataset.event,
      registrants: dataset.registrants,
      defaults,
      settings,
      setSettings,
      resetSettings,
      isDefault: settings === defaults,
      scored,
      baselineRank,
      selectedId,
      setSelectedId,
    }),
    [dataset, defaults, settings, resetSettings, scored, baselineRank, selectedId],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDashboard(): DashboardState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDashboard must be used inside <DashboardProvider>')
  return v
}
