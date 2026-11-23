import { SITE } from '../config/site'

/** Quiet closing line: who built it and where to read more. Shared by both pages. */
export function Footer({ page = 'dashboard' }: { page?: 'dashboard' | 'brief' }) {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <p>{SITE.name}, built by <a href={SITE.author.website} target="_blank" rel="noreferrer">{SITE.author.name}<span className="sr-only"> (opens in a new tab)</span></a> for CCI STEM Connect.</p>
        <nav aria-label="Footer">
          {page === 'dashboard'
            ? <a href={SITE.howItWorksPath}>How it works</a>
            : <a href="/">Dashboard</a>}
          <a href={SITE.author.github} target="_blank" rel="noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
          <a href={`mailto:${SITE.author.email}`}>Contact</a>
        </nav>
      </div>
    </footer>
  )
}
