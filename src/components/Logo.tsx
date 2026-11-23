/** ConnectIQ mark: three connected nodes. Decorative; the wordmark carries the name. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M9 21 L16 10 L23 19 Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" opacity=".85" />
      <circle cx="9" cy="21" r="3.2" fill="#fff" />
      <circle cx="16" cy="10" r="3.2" fill="#fff" />
      <circle cx="23" cy="19" r="3.2" fill="#fff" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span>
        Connect<b>IQ</b>
      </span>
    </span>
  )
}
