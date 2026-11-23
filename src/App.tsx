import { useMemo } from 'react'
import { RoomChart } from './components/charts/RoomChart'
import { Funnel } from './components/Funnel'
import { Header, Intro } from './components/Header'
import { Leaderboard } from './components/Leaderboard'
import { SectionBoundary } from './components/SectionBoundary'
import { loadEvent } from './data/events'
import { DashboardProvider } from './state/dashboard'

export default function App() {
  // Throws on invalid data; caught by the top-level boundary in main.tsx.
  const dataset = useMemo(() => loadEvent(), [])

  return (
    <DashboardProvider dataset={dataset}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <div className="container hero">
          <Intro />
          <SectionBoundary name="The room chart"><RoomChart /></SectionBoundary>
          <SectionBoundary name="Attendance funnel"><Funnel /></SectionBoundary>
        </div>
        <SectionBoundary name="Leaderboard"><Leaderboard /></SectionBoundary>
      </main>
    </DashboardProvider>
  )
}
