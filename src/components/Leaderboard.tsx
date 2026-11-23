import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import { CATEGORIES } from '../data/schema'
import { AREA_LABELS, TIERS, type ScoredAttendee } from '../engine/scoring'
import { useDashboard } from '../state/dashboard'
import { TierBadge } from './TierBadge'

type SortKey = 'rank' | 'name' | 'category' | 'role' | 'people' | 'opportunity' | 'presence' | 'visibility'
type Dir = 'asc' | 'desc'
type Limit = 10 | 20 | 30 | 40 | 50 | 'all'

const LIMITS: readonly Limit[] = [10, 20, 30, 40, 50, 'all']
const DEFAULT_LIMIT: Limit = 10

const COLUMNS: { key: SortKey; label: string; numeric?: boolean; defaultDir: Dir }[] = [
  { key: 'rank', label: 'Rank', numeric: true, defaultDir: 'asc' },
  { key: 'name', label: 'Name', defaultDir: 'asc' },
  { key: 'category', label: 'Category', defaultDir: 'asc' },
  { key: 'role', label: 'Role', defaultDir: 'asc' },
  { key: 'people', label: AREA_LABELS.people, numeric: true, defaultDir: 'desc' },
  { key: 'opportunity', label: AREA_LABELS.opportunity, numeric: true, defaultDir: 'desc' },
  { key: 'presence', label: AREA_LABELS.presence, numeric: true, defaultDir: 'desc' },
  { key: 'visibility', label: AREA_LABELS.visibility, numeric: true, defaultDir: 'desc' },
]

function sortValue(a: ScoredAttendee, key: SortKey): string | number {
  switch (key) {
    case 'rank': return a.rank
    case 'name': return a.registrant.name
    case 'category': return a.registrant.category
    case 'role': return a.registrant.role
    default: return a.areas[key]
  }
}

function RankChange({ delta }: { delta: number }) {
  if (delta === 0) return null
  const up = delta > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`} title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} vs default weights`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      {Math.abs(delta)}
      <span className="sr-only"> places {up ? 'up' : 'down'} versus default weights</span>
    </span>
  )
}

export function Leaderboard() {
  const { scored, baselineRank, setSelectedId } = useDashboard()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [role, setRole] = useState('')
  const [tier, setTier] = useState('')
  const [limit, setLimit] = useState<Limit>(DEFAULT_LIMIT)
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'rank', dir: 'asc' })
  const q = useDeferredValue(query.trim().toLowerCase())

  const roles = useMemo(() => [...new Set(scored.map((a) => a.registrant.role))].sort(), [scored])

  // Filter, keep the top N by rank, then apply the user's column sort.
  const { rows, matching } = useMemo(() => {
    const filtered = scored.filter(
      (a) =>
        (!q || a.registrant.name.toLowerCase().includes(q)) &&
        (!category || a.registrant.category === category) &&
        (!role || a.registrant.role === role) &&
        (!tier || a.tier === tier),
    )
    const top = limit === 'all' ? filtered : filtered.slice(0, limit) // `scored` is already in rank order
    const m = sort.dir === 'asc' ? 1 : -1
    const sorted = [...top].sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      const c = typeof va === 'number' ? va - (vb as number) : va.localeCompare(vb as string)
      return c * m || a.rank - b.rank
    })
    return { rows: sorted, matching: filtered.length }
  }, [scored, q, category, role, tier, limit, sort])

  const toggleSort = (key: SortKey, defaultDir: Dir) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDir }))

  const clearFilters = () => { setQuery(''); setCategory(''); setRole(''); setTier('') }
  const filtersActive = Boolean(query || category || role || tier)
  const scope = filtersActive ? `${matching} matching` : `${scored.length} attendees`

  return (
    <section aria-labelledby="leaderboard-title" className="container report" id="leaderboard">
      <div className="report-rail">
        <h2 id="leaderboard-title">Leaderboard</h2>
        <p className="rail-note">Ranked by Connect Score. Ties share a rank. Select a name to see how their score was built.</p>

        <fieldset className="segmented">
          <legend>Show</legend>
          {LIMITS.map((l) => (
            <label key={l}>
              <input type="radio" name="limit" value={l} checked={limit === l} onChange={() => setLimit(l)} />
              <span>{l === 'all' ? 'All' : `Top ${l}`}</span>
            </label>
          ))}
        </fieldset>

        <div className="filters" role="search">
          <label className="field field-wide">
            <span>Search by name</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="">All</option>
              {TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field field-wide">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All</option>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="report-body">
        <p className="table-meta" aria-live="polite">
          Showing {rows.length} of {scope}
          {filtersActive && <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button>}
        </p>

        <div className="table-scroll" tabIndex={0} aria-label="Leaderboard table, scrolls sideways on small screens">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.slice(0, 2).map((c) => <SortHeader key={c.key} col={c} sort={sort} onSort={toggleSort} />)}
                <th scope="col" className="num">Score</th>
                <th scope="col">Tier</th>
                {COLUMNS.slice(2).map((c) => <SortHeader key={c.key} col={c} sort={sort} onSort={toggleSort} />)}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.registrant.id} onClick={() => setSelectedId(a.registrant.id)}>
                  <td className="num rank-cell">
                    {a.rank}
                    <RankChange delta={(baselineRank.get(a.registrant.id) ?? a.rank) - a.rank} />
                  </td>
                  <th scope="row">
                    <button type="button" className="name-btn" onClick={(e) => { e.stopPropagation(); setSelectedId(a.registrant.id) }}>
                      {a.registrant.name}
                    </button>
                  </th>
                  <td className="num score-cell">
                    {a.score.toFixed(1)}
                    <span className="score-bar" style={{ '--w': `${a.score}%` } as CSSProperties} aria-hidden="true" />
                  </td>
                  <td><TierBadge tier={a.tier} /></td>
                  <td>{a.registrant.category}</td>
                  <td>{a.registrant.role}</td>
                  <td className="num">{a.areas.people.toFixed(1)}</td>
                  <td className="num">{a.areas.opportunity.toFixed(1)}</td>
                  <td className="num">{a.areas.presence.toFixed(1)}</td>
                  <td className="num">{a.areas.visibility.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="empty">
              <p>No attendees match these filters.</p>
              <button type="button" className="btn" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function SortHeader({ col, sort, onSort }: {
  col: (typeof COLUMNS)[number]
  sort: { key: SortKey; dir: Dir }
  onSort: (key: SortKey, defaultDir: Dir) => void
}) {
  const active = sort.key === col.key
  return (
    <th scope="col" className={col.numeric ? 'num' : undefined} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-btn" onClick={() => onSort(col.key, col.defaultDir)}>
        {col.label}
        <span aria-hidden="true" className="sort-icon">{active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  )
}
