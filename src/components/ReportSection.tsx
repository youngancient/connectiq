import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  /** One or two sentences explaining what the section shows. */
  note?: ReactNode
  /** Controls shown under the note (filters, toggles). */
  controls?: ReactNode
  children: ReactNode
}

/** The dashboard's section pattern: heading, note and controls in a rail; content beside it. */
export function ReportSection({ id, title, note, controls, children }: Props) {
  const titleId = `${id}-title`
  return (
    <section aria-labelledby={titleId} className="container report" id={id}>
      <div className="report-rail">
        <h2 id={titleId}>{title}</h2>
        {note && <p className="rail-note">{note}</p>}
        {controls}
      </div>
      <div className="report-body">{children}</div>
    </section>
  )
}
