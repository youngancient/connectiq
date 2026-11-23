import { useMemo, type CSSProperties } from 'react'
import { kpis } from '../engine/analytics'
import { useDashboard } from '../state/dashboard'

const pct = (x: number) => `${Math.round(x * 100)}%`

/** Registered → attended → applied, drawn to scale against registrations. */
export function Funnel() {
  const { registrants, scored } = useDashboard()
  const k = useMemo(() => kpis(registrants, scored), [registrants, scored])

  const steps = [
    { label: 'Registered', value: k.registered, note: 'everyone who signed up' },
    { label: 'Showed up', value: k.attended, note: `${pct(k.showUpRate)} of registrations` },
    { label: 'Applied for an opportunity', value: k.applied, note: `${pct(k.applied / (k.attended || 1))} of attendees` },
  ]

  return (
    <section aria-labelledby="funnel-title" className="funnel">
      <h2 id="funnel-title" className="sr-only">From registration to opportunity</h2>
      <ol>
        {steps.map((s) => (
          <li key={s.label} style={{ '--share': k.registered ? s.value / k.registered : 0 } as CSSProperties}>
            <span className="funnel-value">{s.value}</span>
            <span className="funnel-label">{s.label}</span>
            <span className="funnel-bar" aria-hidden="true" />
            <span className="funnel-note">{s.note}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
