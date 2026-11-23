import { useMemo, useState } from 'react'
import { CATEGORIES } from '../data/schema'
import { tierCounts, tierMixBy } from '../engine/analytics'
import { TIERS, type ScoredAttendee, type Tier } from '../engine/scoring'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'
import { Segmented } from './Segmented'
import { TIER_CLASS } from './TierBadge'

type By = 'category' | 'role'
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)

function MixBar({ label, n, counts }: { label: string; n: number; counts: Record<Tier, number> }) {
  return (
    <tr>
      <th scope="row">
        {label}
        <span className="mix-n">{n}</span>
      </th>
      <td>
        <div className="mix-bar" aria-hidden="true">
          {TIERS.map((t) =>
            counts[t] ? (
              <span key={t} className={`mix-seg ${TIER_CLASS[t]}`} style={{ flexGrow: counts[t] }} title={`${t}: ${counts[t]} (${pct(counts[t], n)}%)`}>
                {pct(counts[t], n) >= 12 && `${pct(counts[t], n)}%`}
              </span>
            ) : null,
          )}
        </div>
      </td>
      {TIERS.map((t) => (
        <td key={t} className="num mix-count">{counts[t]}</td>
      ))}
    </tr>
  )
}

export function TierMix() {
  const { scored } = useDashboard()
  const [by, setBy] = useState<By>('category')

  const rows = useMemo(() => {
    const keyOf = (a: ScoredAttendee) => (by === 'category' ? a.registrant.category : a.registrant.role)
    const mix = tierMixBy(scored, keyOf)
    return by === 'category'
      ? CATEGORIES.flatMap((c) => mix.filter((m) => m.key === c))
      : mix.sort((a, b) => b.counts['Super Connector'] / b.n - a.counts['Super Connector'] / a.n)
  }, [scored, by])
  const all = useMemo(() => tierCounts(scored), [scored])

  return (
    <ReportSection
      id="tiers"
      title="Who reached each tier"
      note="The share of each group in every tier. Super Connector starts at 75, Active at 55 and Emerging at 35."
      controls={
        <Segmented
          legend="Group by"
          value={by}
          onChange={setBy}
          options={[{ value: 'category', label: 'Career stage' }, { value: 'role', label: 'Role' }]}
        />
      }
    >
      <ul className="legend" aria-label="Tiers">
        {TIERS.map((t) => (
          <li key={t}><span className={`legend-swatch ${TIER_CLASS[t]}`} aria-hidden="true" />{t}</li>
        ))}
      </ul>
      <div className="table-scroll">
        <table className="table mix-table">
          <caption className="sr-only">Number of attendees in each tier, by {by === 'category' ? 'career stage' : 'role'}</caption>
          <thead>
            <tr>
              <th scope="col">{by === 'category' ? 'Career stage' : 'Role'}</th>
              <th scope="col"><span className="sr-only">Share by tier</span></th>
              {TIERS.map((t) => <th key={t} scope="col" className="num">{t.split(' ')[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => <MixBar key={r.key} label={r.key} n={r.n} counts={r.counts} />)}
          </tbody>
          <tfoot>
            <MixBar label="All attendees" n={scored.length} counts={all} />
          </tfoot>
        </table>
      </div>
    </ReportSection>
  )
}
