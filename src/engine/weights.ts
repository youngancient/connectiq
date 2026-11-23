/**
 * Weight balancing for the sliders. Weights are handled as whole percentages
 * so the total is always exactly 100.
 */
import type { Settings } from '../data/schema'
import { AREAS, type AreaKey } from './scoring'

export type Weights = Settings['weights']
export type Percents = Record<AreaKey, number>

export const toPercents = (w: Weights): Percents =>
  Object.fromEntries(AREAS.map((k) => [k, Math.round(w[k] * 100)])) as Percents

export const toWeights = (p: Percents): Weights =>
  Object.fromEntries(AREAS.map((k) => [k, p[k] / 100])) as Weights

/**
 * Sets one area to `value`% and shares the rest among the other three in
 * proportion to their current values (equally if they are all zero).
 * Uses largest-remainder rounding, so the result always totals 100.
 */
export function rebalance(current: Percents, key: AreaKey, value: number): Percents {
  const v = Math.min(100, Math.max(0, Math.round(value)))
  const others = AREAS.filter((k) => k !== key)
  const remaining = 100 - v
  const sum = others.reduce((n, k) => n + current[k], 0)

  const raw = others.map((k) => ({ k, x: sum > 0 ? (current[k] / sum) * remaining : remaining / others.length }))
  const out = { [key]: v } as Percents
  let left = remaining
  for (const r of raw) {
    out[r.k] = Math.floor(r.x)
    left -= out[r.k]
  }
  // Hand out the leftover points to the largest fractional parts (ties: area order).
  raw
    .map((r, i) => ({ ...r, frac: r.x - Math.floor(r.x), i }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
    .slice(0, left)
    .forEach((r) => out[r.k]++)
  return out
}

export const sameWeights = (a: Weights, b: Weights) => AREAS.every((k) => Math.abs(a[k] - b[k]) < 1e-9)
