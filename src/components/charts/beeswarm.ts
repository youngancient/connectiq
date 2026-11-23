/**
 * Beeswarm layout: places circles along x (fixed) and nudges each one up or
 * down by the smallest amount that avoids overlapping circles already placed.
 * Pure and deterministic: same input order → same picture.
 */
export interface SwarmPoint<T> {
  item: T
  x: number
  /** Offset from the centre line (negative = above). */
  y: number
}

export function beeswarm<T>(items: readonly T[], xOf: (item: T) => number, radius: number, gap = 1): SwarmPoint<T>[] {
  const d = radius * 2 + gap
  const placed: SwarmPoint<T>[] = []
  const sorted = [...items].sort((a, b) => xOf(a) - xOf(b))

  for (const item of sorted) {
    const x = xOf(item)
    // Only neighbours within one diameter on x can collide.
    const near = placed.filter((p) => Math.abs(p.x - x) < d)
    const collides = (y: number) => near.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < d * d)

    let y = 0
    // Try 0, then alternate below/above in small steps until a free slot appears.
    for (let step = 1; collides(y); step++) {
      const offset = Math.ceil(step / 2) * (d / 2)
      y = step % 2 ? offset : -offset
    }
    placed.push({ item, x, y })
  }
  return placed
}
