import { useCallback, useEffect, useRef, useState } from 'react'
import Dropzone from '../components/Dropzone.jsx'
import DissolveCanvas from '../components/DissolveCanvas.jsx'
import ResultView from '../components/ResultView.jsx'
import LogoMark from '../components/LogoMark.jsx'
import { removeBackground } from '../lib/removeBackground.js'

// Explicit states, not just "loading / loaded" — see crud-app-playbook.
const STATE = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
  DISSOLVING: 'DISSOLVING',
  RESULT: 'RESULT',
  ERROR: 'ERROR',
}

export default function Home() {
  const [state, setState] = useState(STATE.IDLE)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [progressPct, setProgressPct] = useState(0)
  const [processingMs, setProcessingMs] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const objectUrlsRef = useRef([])

  const trackUrl = (url) => {
    objectUrlsRef.current.push(url)
    return url
  }

  useEffect(() => {
    // Revoke every object URL created this session on unmount.
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleFileSelected = useCallback(async (file) => {
    setErrorMessage(null)
    setFileName(file.name)
    const url = trackUrl(URL.createObjectURL(file))
    setOriginalUrl(url)
    setState(STATE.PROCESSING)
    setProgressPct(0)

    const startedAt = performance.now()

    try {
      const resultBlob = await removeBackground(file, ({ current, total }) => {
        if (total > 0) setProgressPct(Math.round((current / total) * 100))
      })
      setProcessingMs(Math.round(performance.now() - startedAt))
      const resultObjectUrl = trackUrl(URL.createObjectURL(resultBlob))
      setResultUrl(resultObjectUrl)
      setState(STATE.DISSOLVING)
    } catch (err) {
      console.error('Cleave: background removal failed', err)
      setErrorMessage(
        'Could not process this image on-device. Try a smaller file or a different browser.',
      )
      setState(STATE.ERROR)
    }
  }, [])

  const handleDissolveComplete = useCallback(() => {
    setState(STATE.RESULT)
  }, [])

  const handleReset = () => {
    setState(STATE.IDLE)
    setOriginalUrl(null)
    setResultUrl(null)
    setErrorMessage(null)
    setProcessingMs(null)
    setProgressPct(0)
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
          client-side / private / no upload
        </span>
        <h1 className="flex items-center gap-3 font-[var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
          <LogoMark size={36} className="sm:h-10 sm:w-10" />
          Cleave
        </h1>
        <p className="max-w-md text-[var(--text-secondary)]">
          Precise background removal that never leaves your browser.
        </p>
      </header>

      {state === STATE.IDLE && (
        <Dropzone onFileSelected={handleFileSelected} />
      )}

      {state === STATE.PROCESSING && (
        <div className="flex w-full flex-col items-center gap-4 py-16">
          {originalUrl && (
            <img
              src={originalUrl}
              alt="Processing preview"
              className="max-h-72 rounded-lg border border-[var(--border)] opacity-60"
            />
          )}
          <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-tertiary)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            processing_local — {progressPct}%
          </div>
        </div>
      )}

      {state === STATE.DISSOLVING && originalUrl && resultUrl && (
        <div className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)]">
          {/* Static placeholder underneath — if WebGL silently fails to
              render, this remains visible instead of a dead black canvas. */}
          <img
            src={resultUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain opacity-80"
          />
          <DissolveCanvas
            originalSrc={originalUrl}
            resultSrc={resultUrl}
            durationMs={2000}
            onComplete={handleDissolveComplete}
          />
        </div>
      )}

      {state === STATE.RESULT && resultUrl && (
        <div className="flex w-full flex-col items-center gap-6">
          <ResultView resultSrc={resultUrl} fileName={fileName} />
          {processingMs !== null && (
            <p className="font-mono text-xs text-[var(--text-tertiary)]">
              processed_in {processingMs}ms — model: imgly/isnet-quant, local
            </p>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer font-mono text-xs text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--accent)]"
          >
            process another image
          </button>
        </div>
      )}

      {state === STATE.ERROR && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-mono text-sm text-[var(--danger)]">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer rounded-md border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text)] hover:border-[var(--accent)]"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  )
}
