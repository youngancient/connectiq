import { useEffect, useMemo, useRef, useState } from 'react'
import { mean } from '../../engine/analytics'
import { TIERS, type Tier } from '../../engine/scoring'
import { useDashboard } from '../../state/dashboard'
import { TIER_CLASS } from '../TierBadge'
import { beeswarm } from './beeswarm'

const SHORT: Record<Tier, string> = {
  'Super Connector': 'Super',
  'Active Connector': 'Active',
  'Emerging Connector': 'Emerging',
  'Passive Attendee': 'Passive',
}

const ZONE_LABEL_H = 44
const AXIS_H = 40
const PAD_X = 10

/** Tracks an element's width so the chart lays out in real pixels at every size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * "The room": every attendee as a dot along the 0–100 Connect Score scale,
 * coloured by tier, with the tier cut-offs drawn as zones.
 */
export function RoomChart() {
  const { scored, settings, setSelectedId } = useDashboard()
  const [ref, width] = useWidth<HTMLDivElement>()
  const r = width < 560 ? 4.5 : 7
  const x = (score: number) => PAD_X + (score / 100) * (width - PAD_X * 2)

  const points = useMemo(() => (width ? beeswarm(scored, (a) => x(a.score), r, 1.5) : []),
    [scored, width, r])
  const spread = points.reduce((m, p) => Math.max(m, Math.abs(p.y)), 0) + r + 6
  const midY = ZONE_LABEL_H + spread
  const height = midY + spread + AXIS_H

  const t = settings.tiers
  const zones: { tier: Tier; from: number; to: number }[] = [
    { tier: 'Passive Attendee', from: 0, to: t.emerging },
    { tier: 'Emerging Connector', from: t.emerging, to: t.active },
    { tier: 'Active Connector', from: t.active, to: t.super },
    { tier: 'Super Connector', from: t.super, to: 100 },
  ]
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, scored.filter((a) => a.tier === tier).length]))
  const avg = mean(scored.map((a) => a.score))
  const summary = `${scored.length} attendees by Connect Score: ${TIERS.map((tier) => `${counts[tier]} ${tier}`).join(', ')}. Average ${avg.toFixed(1)}.`

  return (
    <figure className="room">
      <div ref={ref} className="room-canvas">
        {width > 0 && (
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
            {zones.map((z) => (
              <g key={z.tier} className={`zone ${TIER_CLASS[z.tier]}`}>
                <rect x={x(z.from)} y={0} width={x(z.to) - x(z.from)} height={height - AXIS_H + 6} />
                <text x={x(z.from) + 8} y={18} className="zone-name">{SHORT[z.tier]}</text>
                <text x={x(z.from) + 8} y={36} className="zone-count">{counts[z.tier]}</text>
              </g>
            ))}

            <line className="avg-line" x1={x(avg)} x2={x(avg)} y1={ZONE_LABEL_H - 4} y2={height - AXIS_H + 6} />

            {points.map(({ item: a, x: cx, y }) => (
              <circle
                key={a.registrant.id}
                className={`dot ${TIER_CLASS[a.tier]}`}
                cx={cx}
                cy={midY + y}
                r={r}
                onClick={() => setSelectedId(a.registrant.id)}
              >
                <title>{`${a.registrant.name}: ${a.score.toFixed(1)} (${a.tier})`}</title>
              </circle>
            ))}

            <g className="axis" transform={`translate(0 ${height - AXIS_H + 6})`}>
              {[0, t.emerging, t.active, t.super, 100].map((v) => (
                <text key={v} x={x(v)} y={18} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'}>{v}</text>
              ))}
              <text x={x(avg)} y={34} textAnchor="middle" className="avg-label">avg {avg.toFixed(1)}</text>
            </g>
          </svg>
        )}
      </div>
      <figcaption className="room-caption">
        Each dot is one attendee, placed by Connect Score out of 100. Hover for a name; the full list is in the leaderboard.
      </figcaption>
    </figure>
  )
}
