import { useMemo } from 'react'
import { THRESHOLDS } from '../config/site'
import { keyFindings } from '../engine/findings'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'

export function KeyFindings() {
  const { scored, event, ask } = useDashboard()
  const findings = useMemo(() => keyFindings(scored, event, THRESHOLDS), [scored, event])

  return (
    <ReportSection
      id="findings"
      title="What the data says"
      note={`Each finding is worked out from the data at the current weights. A difference has to be at least ${THRESHOLDS.notableDifference} points, or ${THRESHOLDS.notableConnections} connection, to appear here.`}
    >
      {findings.length === 0 ? (
        <p className="empty-inline">No difference is large enough to report at these weights. Reset the weights to see the default findings.</p>
      ) : (
        <ul className="findings">
          {findings.map((f) => (
            <li key={f.id}>
              <p className="finding-stat">
                <span className="finding-value">{f.stat}</span>
                <span className="finding-unit">{f.statUnit}</span>
              </p>
              <div className="finding-text">
                <p className="finding-headline">{f.headline}</p>
                <p className="finding-detail">{f.detail}</p>
                {f.href && <a className="finding-link" href={f.href}>See the evidence</a>}
                {f.askId && (
                  <button type="button" className="link-btn finding-link" onClick={() => {
                      ask(f.askId!)
                      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                      requestAnimationFrame(() => document.getElementById('ask')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
                    }}>See who they are</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  )
}
