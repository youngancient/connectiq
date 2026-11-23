import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { mean } from '../engine/analytics'
import { explainScore, weightedContributions } from '../engine/explain'
import { AREA_LABELS, AREAS } from '../engine/scoring'
import { useDashboard } from '../state/dashboard'
import { TierBadge } from './TierBadge'

const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, '')

/**
 * The attendee profile, in a native modal <dialog>: the browser traps focus,
 * closes it on Esc, makes the page behind inert and returns focus on close.
 */
export function AttendeeProfile() {
  const { scored, settings, selectedId, setSelectedId } = useDashboard()
  const ref = useRef<HTMLDialogElement>(null)
  const a = useMemo(() => scored.find((x) => x.registrant.id === selectedId) ?? null, [scored, selectedId])

  const averages = useMemo(
    () => Object.fromEntries(AREAS.map((k) => [k, mean(scored.map((x) => x.areas[k]))])) as Record<string, number>,
    [scored],
  )
  const avgScore = useMemo(() => mean(scored.map((x) => x.score)), [scored])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (a && !d.open) d.showModal()
    if (!a && d.open) d.close()
  }, [a])

  const close = () => setSelectedId(null)

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="profile-name"
      onClose={close}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      {a && (
        <div className="drawer-body">
          <header className="drawer-head">
            <div>
              <h2 id="profile-name">{a.registrant.name}</h2>
              <p className="drawer-meta">{a.registrant.role}, {a.registrant.category.toLowerCase()}</p>
            </div>
            <button type="button" className="drawer-close" onClick={close} aria-label="Close profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <section className="drawer-score" aria-label="Connect Score">
            <p className="drawer-big num">{a.score.toFixed(1)}</p>
            <div className="drawer-score-meta">
              <TierBadge tier={a.tier} />
              <p>
                Rank {a.rank} of {scored.length}. The average attendee scored {avgScore.toFixed(1)}.
              </p>
            </div>
          </section>

          <section aria-labelledby="areas-title">
            <h3 id="areas-title" className="drawer-h3">The four areas</h3>
            <ul className="area-list">
              {AREAS.map((k) => {
                const contrib = weightedContributions(a.areas, settings)[k]
                return (
                  <li key={k}>
                    <div className="area-row">
                      <span className="area-name">{AREA_LABELS[k]}</span>
                      <span className="area-value num">{fmt(a.areas[k])}<span className="area-of">/100</span></span>
                    </div>
                    <div className="area-track" aria-hidden="true" style={{ '--v': `${a.areas[k]}%`, '--avg': `${averages[k]}%` } as CSSProperties}>
                      <span className="area-fill" />
                      <span className="area-avg" />
                    </div>
                    <p className="area-note">
                      Average {fmt(averages[k])}. At {Math.round(settings.weights[k] * 100)}% weight this adds {fmt(contrib)} points.
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="points-title">
            <h3 id="points-title" className="drawer-h3">How the points were earned</h3>
            {AREAS.map((k) => {
              const lines = explainScore(a.activity, settings)[k]
              return (
                <table key={k} className="points">
                  <caption>{AREA_LABELS[k]}</caption>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.label} className={l.points === 0 ? 'zero' : undefined}>
                        <th scope="row">{l.label}</th>
                        <td className="num">{fmt(l.points)} <span className="points-max">of {l.max}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Area score</th>
                      <td className="num">{fmt(a.areas[k])}</td>
                    </tr>
                  </tfoot>
                </table>
              )
            })}
          </section>
        </div>
      )}
    </dialog>
  )
}
