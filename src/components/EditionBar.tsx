import { useId } from 'react'
import type { EventDataset } from '../data/schema'
import { formatDate } from './Header'

interface Props {
  editions: readonly EventDataset[]
  activeId: string
  demoId: string
  onSelect: (id: string) => void
  onUpload: () => void
  onRemove: (id: string) => void
  /** Shown when the browser refused to save an upload. */
  storageWarning: boolean
}

/** Which event the dashboard is showing, and the way to load another. */
export function EditionBar({ editions, activeId, demoId, onSelect, onUpload, onRemove, storageWarning }: Props) {
  const selectId = useId()
  const label = (e: EventDataset) => `${e.event.name}${e.event.id === demoId ? ' (demo)' : ''} · ${formatDate(e.event.date)}`
  return (
    <div className="edition-bar">
      {editions.length > 1 ? (
        <label className="edition-select" htmlFor={selectId}>
          <span>Showing</span>
          <select id={selectId} value={activeId} onChange={(e) => onSelect(e.target.value)}>
            {editions.map((e) => <option key={e.event.id} value={e.event.id}>{label(e)}</option>)}
          </select>
        </label>
      ) : (
        <p className="edition-current"><span>Showing</span> {label(editions[0])}</p>
      )}
      <div className="edition-actions">
        <button type="button" className="link-btn" onClick={onUpload} aria-haspopup="dialog">Load event data</button>
        {activeId !== demoId && (
          <button type="button" className="link-btn" onClick={() => onRemove(activeId)}>Remove this event</button>
        )}
      </div>
      {storageWarning && (
        <p className="edition-warning" role="status">
          This browser didn’t allow saving, so the uploaded event will be gone after a refresh.
        </p>
      )}
    </div>
  )
}
