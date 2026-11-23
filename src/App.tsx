import { useMemo } from 'react'
import { RoomChart } from './components/charts/RoomChart'
import { Comparisons } from './components/Comparisons'
import { Funnel } from './components/Funnel'
import { Header, Intro } from './components/Header'
import { KeyFindings } from './components/KeyFindings'
import { Leaderboard } from './components/Leaderboard'
import { SectionBoundary } from './components/SectionBoundary'
import { TierMix } from './components/TierMix'
import { Timing } from './components/Timing'
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
        <SectionBoundary name="Key findings"><KeyFindings /></SectionBoundary>
        <SectionBoundary name="Tier breakdown"><TierMix /></SectionBoundary>
        <SectionBoundary name="Leaderboard"><Leaderboard /></SectionBoundary>
        <SectionBoundary name="Timing and networking"><Timing /></SectionBoundary>
        <SectionBoundary name="Group comparisons"><Comparisons /></SectionBoundary>
      </main>
    </DashboardProvider>
  )
}
