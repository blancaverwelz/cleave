/**
 * Inline version of the favicon mark so it inherits the live CSS custom
 * properties (--bg, --text, --accent) and swaps with light/dark automatically
 * — no separate light/dark <img> swap needed.
 */
export default function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Cleave logo"
    >
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--bg)" stroke="var(--border-strong)" />
      <path d="M9 23 L23 9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 9 L9 23 L16 23"
        fill="none"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23 9 L16 9" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
