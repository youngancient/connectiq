import { describe, expect, it } from 'vitest'
import { beeswarm } from './beeswarm'

describe('beeswarm', () => {
  it('keeps isolated points on the centre line', () => {
    const pts = beeswarm([0, 100, 200], (x) => x, 5)
    expect(pts.map((p) => p.y)).toEqual([0, 0, 0])
  })

  it('never lets circles overlap', () => {
    const xs = Array.from({ length: 60 }, (_, i) => (i * 7) % 40)
    const r = 4
    const pts = beeswarm(xs, (x) => x, r, 1)
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        expect(dist).toBeGreaterThanOrEqual(2 * r + 1 - 1e-9)
      }
  })

  it('preserves every x position', () => {
    const xs = [3, 3, 3, 10]
    expect(beeswarm(xs, (x) => x, 2).map((p) => p.x).sort((a, b) => a - b)).toEqual([3, 3, 3, 10])
  })
})
