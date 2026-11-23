import { useState } from 'react'
import { GROUPS, QUESTIONS, type AnswerTable } from '../engine/ask/catalogue'
import { useDashboard } from '../state/dashboard'
import { ReportSection } from './ReportSection'

const PREVIEW_ROWS = 8

function Table({ table, onOpen }: { table: AnswerTable; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false)
  const rows = all ? table.rows : table.rows.slice(0, PREVIEW_ROWS)
  return (
    <>
      <div className="table-scroll">
        <table className="table answer-table">
          <thead>
            <tr>{table.columns.map((c, i) => <th key={i} scope="col" className={table.numeric?.[i] ? 'num' : undefined}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="static">
                {r.map((v, j) => (
                  <td key={j} className={table.numeric?.[j] ? 'num' : undefined}>
                    {j === 0 && table.ids ? (
                      <button type="button" className="name-btn" onClick={() => onOpen(table.ids![i])}>{v}</button>
                    ) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length > PREVIEW_ROWS && (
        <button type="button" className="link-btn answer-more" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${table.rows.length}`}
        </button>
      )}
    </>
  )
}

/** Preset questions only; one answer at a time. Findings can open a question here. */
export function AskTheData() {
  const { scored, registrants, event, askedId, ask, setSelectedId } = useDashboard()
  const question = QUESTIONS.find((q) => q.id === askedId)
  const answer = question?.answer({ scored, registrants, event })

  return (
    <ReportSection
      id="ask"
      title="Ask the data"
      note="Pick a question. Every answer is calculated from the dataset, never generated, so it always matches the charts and follows the current weights. Select a name to open that person's profile."
      controls={question && <button type="button" className="btn ask-clear" onClick={() => ask(null)}>Clear answer</button>}
    >
      <div className="ask-chips">
        {GROUPS.map((g) => (
          <div key={g} className="chip-group">
            <p className="chip-label">{g}</p>
            <div className="chips">
              {QUESTIONS.filter((q) => q.group === g).map((q) => (
                <button key={q.id} type="button" className="chip" aria-pressed={q.id === askedId} onClick={() => ask(q.id)}>
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div aria-live="polite">
        {question && answer && (
          <div className="turn" key={question.id}>
            <p className="turn-q">{question.text}</p>
            <div className="turn-a">
              <p className="answer-sentence">{answer.sentence}</p>
              {answer.table && <Table table={answer.table} onOpen={setSelectedId} />}
              <details className="answer-method">
                <summary>How this was calculated</summary>
                <dl>
                  <dt>Who</dt><dd>{answer.method.filter}</dd>
                  <dt>Method</dt><dd>{answer.method.formula}</dd>
                  <dt>Based on</dt><dd>{answer.method.n} {answer.method.n === 1 ? 'record' : 'records'}</dd>
                </dl>
              </details>
            </div>
          </div>
        )}
      </div>
    </ReportSection>
  )
}
