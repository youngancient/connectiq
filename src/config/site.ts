/**
 * Site-wide copy, links and UI thresholds. Everything the UI might be tempted
 * to hard-code lives here. TODO values must be filled in before deploying.
 */
export const SITE = {
  name: 'ConnectIQ',
  tagline: 'How well each attendee used the event to connect with people and opportunities',
  author: {
    name: 'Jude Okoye',
    website: 'https://judetochy.vercel.app/',
    email: 'TODO: your email',
    github: 'https://github.com/youngancient/connectiq',
    linkedin: 'TODO: https://www.linkedin.com/in/<user>',
  },
  /** The explainer page. /brief is kept as an alias so older links still work. */
  howItWorksPath: '/about',
} as const

export const THRESHOLDS = {
  /** "Hidden potential": strong networkers who didn't capture opportunities. */
  hiddenPotential: { minPeople: 70, maxOpportunity: 40 },
  /** Score differences (points out of 100) below this are "slightly" and don't make a finding. */
  notableDifference: 5,
  /** Connection-count differences below this don't make a finding. */
  notableConnections: 1,
  /** Groups smaller than this are flagged as small and never headline a finding. */
  minGroupSize: 5,
} as const
