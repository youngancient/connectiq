import { useMemo, useState } from 'react'
import { AskTheData } from './components/AskTheData'
import { AttendeeProfile } from './components/AttendeeProfile'
import { RoomChart } from './components/charts/RoomChart'
import { Comparisons } from './components/Comparisons'
import { EditionBar } from './components/EditionBar'
import { Funnel } from './components/Funnel'
import { Header, Intro } from './components/Header'
import { KeyFindings } from './components/KeyFindings'
import { Leaderboard } from './components/Leaderboard'
import { ModelControls } from './components/ModelControls'
import { SectionBoundary } from './components/SectionBoundary'
import { TierMix } from './components/TierMix'
import { Timing } from './components/Timing'
import { UploadDialog } from './components/UploadDialog'
import { DEFAULT_EVENT_ID, loadEvent } from './data/events'
import type { EventDataset } from './data/schema'
import { loadStoredEditions, saveStoredEditions } from './lib/uploadStore'
import { DashboardProvider } from './state/dashboard'

export default function App() {
  // The bundled demo throws on invalid data; caught by the top-level boundary in main.tsx.
  const demo = useMemo(() => loadEvent(), [])
  const [uploads, setUploads] = useState<EventDataset[]>(loadStoredEditions)
  const [activeId, setActiveId] = useState(DEFAULT_EVENT_ID)
  const [uploading, setUploading] = useState(false)
  const [storageWarning, setStorageWarning] = useState(false)

  const editions = useMemo(() => [demo, ...uploads], [demo, uploads])
  const dataset = editions.find((e) => e.event.id === activeId) ?? demo

  const persist = (next: EventDataset[]) => {
    setUploads(next)
    setStorageWarning(!saveStoredEditions(next))
  }

  const onLoad = (d: EventDataset) => {
    // Re-uploading the same event (same name and date) replaces it rather than duplicating it.
    persist([...uploads.filter((u) => u.event.id !== d.event.id), d])
    setActiveId(d.event.id)
    setUploading(false)
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const onRemove = (id: string) => {
    persist(uploads.filter((u) => u.event.id !== id))
    setActiveId(DEFAULT_EVENT_ID)
  }

  const networking = demo.event.schedule.find((s) => /network/i.test(s.session))

  return (
    // key: switching events gives a fresh dashboard (weights, filters and open profile reset).
    <DashboardProvider key={dataset.event.id} dataset={dataset}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <div className="container hero">
          <EditionBar
            editions={editions}
            activeId={dataset.event.id}
            demoId={DEFAULT_EVENT_ID}
            onSelect={setActiveId}
            onUpload={() => setUploading(true)}
            onRemove={onRemove}
            storageWarning={storageWarning}
          />
          <Intro />
          <SectionBoundary name="The room chart"><RoomChart /></SectionBoundary>
          <SectionBoundary name="Attendance funnel"><Funnel /></SectionBoundary>
        </div>
        <SectionBoundary name="Weight controls"><ModelControls /></SectionBoundary>
        <SectionBoundary name="Key findings"><KeyFindings /></SectionBoundary>
        <SectionBoundary name="Tier breakdown"><TierMix /></SectionBoundary>
        <SectionBoundary name="Leaderboard"><Leaderboard /></SectionBoundary>
        <SectionBoundary name="Ask the data"><AskTheData /></SectionBoundary>
        <SectionBoundary name="Timing and networking"><Timing /></SectionBoundary>
        <SectionBoundary name="Group comparisons"><Comparisons /></SectionBoundary>
      </main>
      <SectionBoundary name="Attendee profile"><AttendeeProfile /></SectionBoundary>
      <UploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        onLoad={onLoad}
        model={demo.event.settings}
        defaultTimes={{ keynote: demo.event.settings.eventStart, networking: networking?.start ?? '15:15' }}
      />
    </DashboardProvider>
  )
}
