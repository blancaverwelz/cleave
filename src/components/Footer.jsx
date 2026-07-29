export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-[var(--border)] px-6 py-6">
      <p className="text-center font-mono text-xs text-[var(--text-tertiary)]">
        © {year} Cleave. Designed and Developed by{' '}
        <a
          href="https://blncvr-studios.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--accent)]"
        >
          BLNCVR Studios
        </a>
      </p>
    </footer>
  )
}
