import { useMemo, useState, type CSSProperties } from 'react'
import { THRESHOLDS } from '../config/site'
import { byCategory, byRole, byTrack, mean, type GroupStats } from '../engine/analytics'
import { AREA_LABELS, AREAS, type AreaKey } from '../engine/scoring'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'
import { Segmented } from './Segmented'

type By = 'role' | 'category' | 'track'
type Col = AreaKey | 'score'

const LABEL: Record<By, string> = { role: 'Role', category: 'Career stage', track: 'Breakout track' }

export function Comparisons() {
  const { scored } = useDashboard()
  const [by, setBy] = useState<By>('role')

  const groups = useMemo(() => {
    const g = by === 'role' ? byRole(scored) : by === 'category' ? byCategory(scored) : byTrack(scored)
    return g.sort((a, b) => b.score - a.score)
  }, [scored, by])

  const overall = useMemo(
    () => ({
      score: mean(scored.map((a) => a.score)),
      ...Object.fromEntries(AREAS.map((k) => [k, mean(scored.map((a) => a.areas[k]))])),
    }) as Record<Col, number>,
    [scored],
  )

  // The highest value in each column among groups large enough to compare.
  const best = useMemo(() => {
    const eligible = groups.filter((g) => g.n >= THRESHOLDS.minGroupSize)
    const val = (g: GroupStats, c: Col) => (c === 'score' ? g.score : g.areas[c])
    return Object.fromEntries((['score', ...AREAS] as Col[]).map((c) => [c, Math.max(...eligible.map((g) => val(g, c)))])) as Record<Col, number>
  }, [groups])

  const cell = (g: GroupStats, c: Col) => {
    const v = c === 'score' ? g.score : g.areas[c]
    const isBest = g.n >= THRESHOLDS.minGroupSize && v === best[c]
    return (
      <td key={c} className={`num cmp-cell${isBest ? ' cmp-best' : ''}`}>
        {v.toFixed(1)}
        {isBest && <span className="sr-only"> (highest)</span>}
        <span className="cmp-bar" aria-hidden="true"><span style={{ '--share': v / 100 } as CSSProperties} /></span>
      </td>
    )
  }

  return (
    <ReportSection
      id="comparisons"
      title="How groups compare"
      note={
        <>
          Average score in each area, out of 100. The highest in each column is in bold. Groups under {THRESHOLDS.minGroupSize} people are marked
          and not ranked.{by === 'track' && ' Attendees who left before breakouts are not included.'}
        </>
      }
      controls={
        <Segmented
          legend="Compare by"
          value={by}
          onChange={setBy}
          options={[{ value: 'role', label: 'Role' }, { value: 'category', label: 'Career stage' }, { value: 'track', label: 'Breakout' }]}
        />
      }
    >
      <div className="table-scroll" tabIndex={0} aria-label="Group comparison table, scrolls sideways on small screens">
        <table className="table cmp-table">
          <caption className="sr-only">Average area scores by {LABEL[by].toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">{LABEL[by]}</th>
              <th scope="col" className="num">People</th>
              <th scope="col" className="num">Connect Score</th>
              {AREAS.map((k) => <th key={k} scope="col" className="num">{AREA_LABELS[k]}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="static">
                <th scope="row">
                  {g.key}
                  {g.n < THRESHOLDS.minGroupSize && <span className="small-group">small group</span>}
                </th>
                <td className="num">{g.n}</td>
                {cell(g, 'score')}
                {AREAS.map((k) => cell(g, k))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="static">
              <th scope="row">All attendees</th>
              <td className="num">{scored.length}</td>
              {(['score', ...AREAS] as Col[]).map((c) => <td key={c} className="num">{overall[c].toFixed(1)}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportSection>
  )
}
