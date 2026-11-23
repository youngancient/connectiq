import { useMemo } from 'react'
import { Header } from '../components/Header'
import { ReportSection } from '../components/ReportSection'
import { SITE } from '../config/site'
import { loadEvent } from '../data/events'
import { BREAKOUT_TRACKS } from '../data/schema'
import { AREA_LABELS, AREAS } from '../engine/scoring'

const isSet = (v: string) => !v.startsWith('TODO')
/** Tells screen-reader users a link leaves the page. */
const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>

/**
 * The project brief. Model settings (weights, caps, tiers, schedule) come from
 * the event config, so the brief and the dashboard can't disagree.
 */
export function BriefPage() {
  const { event } = useMemo(() => loadEvent(), [])
  const s = event.settings
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const lateWindow = toMin(s.latestCheckin) - toMin(s.eventStart)
  const w = (area: (typeof AREAS)[number]) => `${Math.round(s.weights[area] * 100)}%`
  const { author } = SITE

  return (
    <>
      <a className="skip-link" href="#brief">Skip to content</a>
      <Header page="brief" />
      <main id="brief" className="brief">
        <header className="container brief-head">
          <h1>ConnectIQ: attendee performance at {event.name}</h1>
          <dl className="brief-meta">
            {isSet(author.name) && (
              <div>
                <dt>Owner</dt>
                <dd>{isSet(author.website) ? <a href={author.website} target="_blank" rel="noopener noreferrer">{author.name}<NewTab /></a> : author.name}</dd>
              </div>
            )}
            {isSet(author.github) && (
              <div>
                <dt>Repository</dt>
                <dd>
                  <a href={author.github} target="_blank" rel="noopener noreferrer">
                    {author.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/').map((part, i) => (
                      <span key={i}>{i > 0 && <>/<wbr /></>}{part}</span>
                    ))}
                    <NewTab />
                  </a>
                </dd>
              </div>
            )}
            <div><dt>Last updated</dt><dd>23 November 2026</dd></div>
          </dl>
        </header>

          <ReportSection id="brief-purpose-and-success-criteria" title="Purpose and success criteria">
            <p>
              ConnectIQ is for the organisers of {event.name}, Celebration Church International's STEM community event. Each
              edition exists to connect students, graduates and professionals with people and
              opportunities, so ConnectIQ measures performance as exactly that, not as how much someone learned. It gives each
              of the attendees a Connect Score out of 100, places them in one of four tiers, and shows the organisers
              what drove the results and who to follow up with.
            </p>
            <p>
              Success means an organiser can see within a minute how the room did, trace any person's score line by line to the
              data behind it, and leave with a short list of people and actions for the next edition.
            </p>
          </ReportSection>

          <ReportSection id="brief-how-it-works" title="How it works">
            <p>
              The data comes from the event spreadsheet: one row per registration, with check-in time, sessions attended,
              connections made, opportunities explored, follow-ups within a week, applications, questions asked, community
              sign-ups and LinkedIn posts. A build step checks every row against a strict format, so a bad row stops the build with
              the line and field at fault instead of producing a wrong score. Only people who checked in are scored; no-shows
              count towards the show-up rate only.
            </p>
            <p>Each attendee earns points in four areas, each out of 100:</p>
            <ul>
              <li><strong>{AREA_LABELS.people}</strong> ({w('people')}): connections made, capped at {s.caps.connections}, plus joining the networking session and meeting a speaker.</li>
              <li><strong>{AREA_LABELS.opportunity}</strong> ({w('opportunity')}): opportunities explored, follow-ups within a week, and applying for an opportunity.</li>
              <li><strong>{AREA_LABELS.presence}</strong> ({w('presence')}): arriving by the keynote, with credit falling to nothing {lateWindow} minutes later, and sessions attended.</li>
              <li><strong>{AREA_LABELS.visibility}</strong> ({w('visibility')}): questions asked, joining the CCI STEM community, and posting about the event.</li>
            </ul>
            <p>
              The Connect Score combines the four using those weights. Super Connectors score {s.tiers.super} or more, Active
              Connectors {s.tiers.active} or more, Emerging Connectors {s.tiers.emerging} or more, and the rest are Passive
              Attendees. It is a weighted scorecard, not machine learning: there are no outcomes to train on yet, and every point
              has to be explainable. The scores match the spreadsheet's own formulas for every attendee, which an automated test
              checks on every change.
            </p>
            <p>
              The weights above are the defaults, not fixed. On the dashboard, organisers can move a slider for each area to
              reflect what matters most to them, for example counting opportunities more than presence. The other three weights
              adjust so the total always stays at 100%, and every score, tier, ranking and finding updates at once; the
              leaderboard marks how far each person moved from their default rank. One button resets everything to the defaults.
            </p>
          </ReportSection>

          <ReportSection id="brief-assumptions" title="Assumptions">
            <p>
              In the demo edition, the registration total comes from the event's Luma page, while attendance and everything
              attendees did is simulated, with fictional names. Punctuality is measured from each edition's keynote time, and the
              breakouts are the four CCI STEM tracks: {BREAKOUT_TRACKS.join(', ').replace(/, ([^,]*)$/, ' and $1')}. The weights,
              caps and tier thresholds are reasoned starting points, not fitted to outcomes.
            </p>
          </ReportSection>

          <ReportSection id="brief-limitations" title="Limitations">
            <ul>
              <li>
                The data is synthetic, because I don't have access to the event's actual attendee data. The findings therefore show
                how the model works rather than what happened at the event.
              </li>
              <li>Scores have not been checked against real outcomes, so a high score means strong engagement, not proven benefit.</li>
              <li>Some behaviour counts twice by design: joining networking adds to People Connections and to sessions under Presence, and arriving late lowers punctuality and usually costs a session.</li>
              <li>Connections and follow-ups rely partly on self-reporting.</li>
              <li>Uploaded events are kept only in the browser that loaded them, so colleagues on other computers need to load the file themselves.</li>
            </ul>
          </ReportSection>

          <ReportSection id="brief-next-version" title="Next version">
            <ul>
              <li>
                <strong>Compare editions.</strong> Organisers can already load any CCI STEM Connect edition's spreadsheet from
                the dashboard (it is checked row by row and scored in the browser). The next step is to set loaded editions side by
                side, scored with the same weights so the numbers are comparable: show-up rate, average Connect Score, tier mix, and
                how networking, arrival time and breakouts played out in each. That shows whether changes to the programme, such as
                starting networking earlier, actually moved the results.
              </li>
              <li>
                <strong>Shared editions.</strong> A small backend with sign-in, so an organising team sees the same uploaded
                editions on every computer.
              </li>
            </ul>
          </ReportSection>
      </main>
    </>
  )
}
