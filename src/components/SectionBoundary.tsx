import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Shown in the fallback, e.g. "Leaderboard". */
  name: string
  children: ReactNode
}

/** Contains a failure to one section so the rest of the dashboard keeps working. */
export class SectionBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ConnectIQ] ${this.props.name} failed`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card fallback" role="alert">
        <strong>{this.props.name} couldn’t load.</strong>
        <p className="muted">The rest of the dashboard is unaffected.</p>
        <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
