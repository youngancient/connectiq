import { useMemo, useRef, type CSSProperties } from 'react'
import { AREA_LABELS, AREAS, type AreaKey } from '../engine/scoring'
import { rebalance, toPercents, toWeights } from '../engine/weights'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'

const HINT: Record<AreaKey, string> = {
  people: 'Meeting people: connections, networking, speakers',
  opportunity: 'Pursuing opportunities: exploring, following up, applying',
  presence: 'Being there: arriving on time and staying for sessions',
  visibility: 'Being seen: asking questions, joining the community, posting',
}

export function ModelControls() {
  const { settings, setSettings, resetSettings, isDefault, defaults } = useDashboard()
  const pct = useMemo(() => toPercents(settings.weights), [settings.weights])
  const defaultPct = useMemo(() => toPercents(defaults.weights), [defaults.weights])

  // Rebalance from the weights as they were when this slider was picked up,
  // not from the last step, so rounding never compounds over a drag.
  const base = useRef<{ key: AreaKey; pct: typeof pct } | null>(null)
  const grab = (key: AreaKey) => { if (base.current?.key !== key) base.current = { key, pct } }
  const change = (key: AreaKey, value: number) => {
    grab(key)
    setSettings({ ...settings, weights: toWeights(rebalance(base.current!.pct, key, value)) })
  }
  const reset = () => { base.current = null; resetSettings() }

  return (
    <ReportSection
      id="weights"
      title="Adjust the weights"
      note="How much each area counts towards the Connect Score. Moving one slider shares the difference among the other three, so the total stays at 100%. Everything on the page updates as you move them."
      controls={
        <div className="weights-actions">
          <button type="button" className="btn" onClick={reset} disabled={isDefault}>
            Reset to default weights
          </button>
          <p className="weights-status" aria-live="polite">
            {isDefault ? 'Using the default weights.' : 'Custom weights. Ranks show ▲▼ against the defaults.'}
          </p>
        </div>
      }
    >
      <div className="sliders">
        {AREAS.map((k) => (
          <div key={k} className="slider">
            <label htmlFor={`w-${k}`} className="slider-head">
              <span className="slider-name">{AREA_LABELS[k]}</span>
              <span className="slider-value num">{pct[k]}%</span>
            </label>
            <input
              id={`w-${k}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct[k]}
              onChange={(e) => change(k, Number(e.target.value))}
              onPointerDown={() => { base.current = null; grab(k) }}
              onFocus={() => { base.current = null; grab(k) }}
              aria-describedby={`w-${k}-hint`}
              aria-valuetext={`${pct[k]} percent`}
              style={{ '--fill': `${pct[k]}%` } as CSSProperties}
            />
            <p id={`w-${k}-hint`} className="slider-hint">
              {HINT[k]}
              {pct[k] !== defaultPct[k] && <span className="slider-default"> Default {defaultPct[k]}%.</span>}
            </p>
          </div>
        ))}
      </div>
    </ReportSection>
  )
}
