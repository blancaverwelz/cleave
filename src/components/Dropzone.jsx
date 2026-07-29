import { useCallback, useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function Dropzone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Use a PNG, JPG, or WEBP image.')
        return
      }
      setError(null)
      onFileSelected(file)
    },
    [onFileSelected],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          'group flex w-full cursor-pointer flex-col items-center justify-center gap-3',
          'rounded-lg border px-8 py-16 text-center transition-colors',
          isDragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
        ].join(' ')}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          drop_image.png
        </span>
        <span className="text-lg text-[var(--text)]">
          Drop an image, or{' '}
          <span className="text-[var(--accent)] underline underline-offset-4">
            browse files
          </span>
        </span>
        <span className="font-mono text-xs text-[var(--text-tertiary)]">
          PNG / JPG / WEBP — processed entirely on your device
        </span>
      </button>

      {error && (
        <p className="mt-3 font-mono text-xs text-[var(--danger)]">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  )
}
