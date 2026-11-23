import { useMemo, type CSSProperties } from 'react'
import { byArrival, byNetworking, type GroupStats } from '../engine/analytics'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'

interface Row { label: string; n: number; value: number }

/** Labelled horizontal bars. Values are shown as text, so the bars are decorative. */
function Bars({ title, unit, rows, max }: { title: string; unit: string; rows: Row[]; max: number }) {
  return (
    <figure className="bars">
      <figcaption>{title}</figcaption>
      <table className="bars-table">
        <thead className="sr-only">
          <tr><th scope="col">Group and number of people</th><th scope="col">{unit}</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}<span className="bars-n">{r.n} people</span></th>
              <td>
                <div className="bars-cell">
                  <span className="bars-track" aria-hidden="true">
                    <span className="bars-fill" style={{ '--share': max ? r.value / max : 0 } as CSSProperties} />
                  </span>
                  <span className="bars-value num">{r.value.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

const toRows = (groups: GroupStats[], pick: (g: GroupStats) => number, label = (g: GroupStats) => g.key): Row[] =>
  groups.map((g) => ({ label: label(g), n: g.n, value: pick(g) }))

export function Timing() {
  const { scored, event } = useDashboard()
  const arrival = useMemo(() => byArrival(scored, event), [scored, event])
  const net = useMemo(() => byNetworking(scored), [scored])
  const netGroups = [net.attended, net.skipped].filter((g): g is GroupStats => Boolean(g))
  const netLabel = (g: GroupStats) => (g.key === 'attended' ? 'Joined networking' : 'Skipped networking')

  return (
    <ReportSection
      id="timing"
      title="Timing and networking"
      note="How arrival time and the networking session relate to results. These show patterns in who did what, not proof of cause."
    >
      <div className="bars-grid">
        <Bars title="Average Connect Score by arrival time" unit="Average Connect Score" rows={toRows(arrival, (g) => g.score)} max={100} />
        <Bars title="Average connections by arrival time" unit="Average connections" rows={toRows(arrival, (g) => g.connections)} max={Math.max(...arrival.map((g) => g.connections), 1)} />
        <Bars title="Average connections by networking" unit="Average connections" rows={toRows(netGroups, (g) => g.connections, netLabel)} max={Math.max(...netGroups.map((g) => g.connections), 1)} />
        <Bars title="Average Connect Score by networking" unit="Average Connect Score" rows={toRows(netGroups, (g) => g.score, netLabel)} max={100} />
      </div>
    </ReportSection>
  )
}
