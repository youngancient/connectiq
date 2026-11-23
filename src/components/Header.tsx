import { useId } from 'react'
import { SITE } from '../config/site'
import { useDashboard } from '../state/dashboard'
import { Wordmark } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Wordmark />
        <div className="header-actions">
          <a className="header-link" href={SITE.briefPath}>Project brief</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/** Opening statement above "the room" chart. */
export function Intro() {
  const { event, scored } = useDashboard()
  const tipId = useId()
  return (
    <div className="intro">
      <h1>How well did {scored.length} attendees connect?</h1>
      <p className="lede">
        The Connect Score rates how well each person at {event.name} on {formatDate(event.date)} met people and
        pursued opportunities, out of 100.
      </p>
      {event.synthetic && (
        <span className="tooltip-wrap">
          <button type="button" className="badge-synthetic" aria-describedby={tipId}>Synthetic data</button>
          <span role="tooltip" id={tipId} className="tooltip">{SITE.syntheticNote}</span>
        </span>
      )}
    </div>
  )
}
