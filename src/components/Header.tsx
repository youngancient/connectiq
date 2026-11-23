import { SITE } from '../config/site'
import { useDashboard } from '../state/dashboard'
import { Wordmark } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** Site header. On the brief it links back to the dashboard instead. */
export function Header({ page = 'dashboard' }: { page?: 'dashboard' | 'brief' }) {
  return (
    <header className="site-header">
      <div className="container header-row">
        <a href="/" className="wordmark-link" aria-label="ConnectIQ dashboard"><Wordmark /></a>
        <div className="header-actions">
          {page === 'dashboard'
            ? <a className="header-link" href={SITE.howItWorksPath}>How it works</a>
            : <a className="header-link" href="/">Dashboard</a>}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/** Opening statement above "the room" chart. */
export function Intro() {
  const { event, scored } = useDashboard()
  return (
    <div className="intro">
      <h1>How well did {scored.length} attendees connect?</h1>
      <p className="lede">
        The Connect Score shows, out of 100, how well each attendee used {event.name} to meet people and find
        opportunities.
      </p>
    </div>
  )
}
