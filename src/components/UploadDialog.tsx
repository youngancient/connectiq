import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { EventDataset, Settings } from '../data/schema'
import {
  UPLOAD_LIMITS, buildUploadedEvent, parseAttendeesUpload, suggestedDate, suggestedName, validateDetails,
  type ParseResult, type UploadDetails,
} from '../data/upload'

const SAMPLE = '/samples/cci-stem-connect-2025-sample.csv'
const SAMPLE_WITH_ERRORS = '/samples/cci-stem-connect-2025-with-errors.csv'
const TEMPLATE = '/samples/connectiq-template.csv'
const PREVIEW_ERRORS = 12

interface Props {
  open: boolean
  onClose: () => void
  /** Called with a validated edition, ready to show. */
  onLoad: (dataset: EventDataset) => void
  /** Weights, caps and tiers to score the upload with (the current model). */
  model: Settings
  /** Default keynote and networking times, from the current event. */
  defaultTimes: { keynote: string; networking: string }
}

type Loaded = { fileName: string; result: ParseResult }

/** Load an attendee spreadsheet (CSV): pick a file, review problems, confirm event details. */
export function UploadDialog({ open, onClose, onLoad, model, defaultTimes }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ids = { title: useId(), file: useId() }
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState<UploadDetails>({ name: '', date: '', ...defaultTimes })
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const reset = () => {
    setLoaded(null); setReadError(null); setShowAllErrors(false); setTried(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  const close = () => { reset(); onClose() }

  const accept = (fileName: string, text: string) => {
    const result = parseAttendeesUpload(text)
    setLoaded({ fileName, result })
    setShowAllErrors(false); setTried(false)
    if (result.ok) {
      setDetails({ name: suggestedName(fileName), date: suggestedDate(result.registrants), ...defaultTimes })
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReadError(null)
    if (!/\.csv$/i.test(file.name)) { setLoaded(null); setReadError('Choose a .csv file. In Excel or Google Sheets, use “Save as / Download → CSV”.'); return }
    if (file.size > UPLOAD_LIMITS.maxBytes) { setLoaded(null); setReadError('That file is larger than 2 MB, which is far more than an event export should be.'); return }
    setBusy(true)
    try { accept(file.name, await file.text()) }
    catch { setLoaded(null); setReadError('The file could not be read. Try exporting it again as CSV.') }
    finally { setBusy(false) }
  }

  const loadSample = async (url: string) => {
    setReadError(null); setBusy(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      accept(url.split('/').pop()!, await res.text())
    } catch {
      setReadError('The sample file could not be loaded. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  const result = loaded?.result
  const valid = result?.ok ? result.registrants : []
  const checkedIn = valid.filter((r) => r.activity).length
  const formErrors = validateDetails(details)
  const blocked = !result?.ok || valid.length === 0 || checkedIn === 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (blocked || Object.keys(formErrors).length) return
    onLoad(buildUploadedEvent(details, valid, model))
    reset()
  }

  const field = (key: keyof UploadDetails, label: string, type: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={details[key]}
        onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
        aria-invalid={tried && Boolean(formErrors[key])}
      />
      {tried && formErrors[key] && <span className="field-error">{formErrors[key]}</span>}
    </label>
  )

  return (
    <dialog
      ref={ref}
      className="upload-dialog"
      aria-labelledby={ids.title}
      onClose={close}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="upload-body">
        <div className="upload-head">
          <h3 id={ids.title}>Load event data</h3>
          <button type="button" className="drawer-close" onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {!result?.ok && (
          <>
            <p className="upload-note">
              Choose the attendee spreadsheet for a CCI STEM Connect edition, saved as CSV with the same columns as the{' '}
              <a href={TEMPLATE} download>template</a>. The file is read in this browser and is not sent anywhere.
            </p>
            <label className="upload-drop" htmlFor={ids.file}>
              <span className="upload-drop-title">{busy ? 'Reading…' : 'Choose a CSV file'}</span>
              <span className="upload-drop-hint">Up to 2 MB</span>
            </label>
            <input id={ids.file} ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} disabled={busy} />
            <p className="upload-samples">
              No file to hand? Try the{' '}
              <button type="button" className="link-btn" onClick={() => loadSample(SAMPLE)} disabled={busy}>2025 sample</button>
              {' '}or the{' '}
              <button type="button" className="link-btn" onClick={() => loadSample(SAMPLE_WITH_ERRORS)} disabled={busy}>sample with mistakes</button>.
            </p>
            {(readError || (result && !result.ok)) && (
              <p className="upload-error" role="alert">{readError ?? (result && !result.ok ? result.reason : '')}</p>
            )}
          </>
        )}

        {result?.ok && (
          <form onSubmit={submit} className="upload-review" noValidate>
            <p className="upload-file">{loaded!.fileName}</p>
            <p className="upload-summary" role="status">
              <strong>{valid.length} of {result.totalRows} rows are ready</strong>, {checkedIn} of them checked in.
              {result.errors.length > 0 && <> {result.errors.length} {result.errors.length === 1 ? 'problem was' : 'problems were'} found; those rows will be left out.</>}
            </p>

            {result.errors.length > 0 && (
              <div className="upload-problems">
                <ul>
                  {(showAllErrors ? result.errors : result.errors.slice(0, PREVIEW_ERRORS)).map((e, i) => (
                    <li key={i}><span className="problem-line">Line {e.line}{e.who ? ` · ${e.who}` : ''}</span>{e.message}</li>
                  ))}
                </ul>
                {result.errors.length > PREVIEW_ERRORS && (
                  <button type="button" className="link-btn" onClick={() => setShowAllErrors(!showAllErrors)}>
                    {showAllErrors ? 'Show fewer' : `Show all ${result.errors.length}`}
                  </button>
                )}
              </div>
            )}

            {checkedIn === 0 ? (
              <p className="upload-error" role="alert">No valid row in this file checked in, so there is nobody to score. Fix the file and choose it again.</p>
            ) : (
              <fieldset className="upload-details">
                <legend>Event details</legend>
                {field('name', 'Event name', 'text')}
                {field('date', 'Event date', 'date')}
                {field('keynote', 'Keynote start', 'time')}
                {field('networking', 'Networking start', 'time')}
                <p className="upload-hint">
                  Arriving by the keynote earns full punctuality points, falling to none 75 minutes later. Scores use the same weights,
                  caps and tiers as the current model.
                </p>
              </fieldset>
            )}

            <div className="export-actions">
              <button type="button" className="btn" onClick={reset}>Choose another file</button>
              <button type="submit" className="btn btn-dark" disabled={blocked}>
                Show {checkedIn} {checkedIn === 1 ? 'attendee' : 'attendees'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
