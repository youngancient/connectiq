import type { Tier } from '../engine/scoring'

export const TIER_CLASS: Record<Tier, string> = {
  'Super Connector': 'tier-super',
  'Active Connector': 'tier-active',
  'Emerging Connector': 'tier-emerging',
  'Passive Attendee': 'tier-passive',
}

/** Tier label with its colour. The text is always present, so colour is never the only signal. */
export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier ${TIER_CLASS[tier]}`}>{tier}</span>
}
