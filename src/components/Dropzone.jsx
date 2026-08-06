import { useCallback, useRef, useState } from 'react'
import { DragDropIcon } from './icons.jsx'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Drag-and-drop surface. `compact` shrinks the padding/icon for use in the
 *  result view's sidebar; the full-size version stays on the landing page. */
export default function Dropzone({ onFileSelected, compact = false }) {
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
          'group flex w-full cursor-pointer flex-col items-center justify-center',
          'rounded-lg border text-center transition-colors',
          compact ? 'gap-2 px-4 py-8' : 'gap-3 px-8 py-16',
          isDragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
        ].join(' ')}
      >
        <DragDropIcon
          size={compact ? 28 : 40}
          className="text-[var(--text-secondary)]"
        />
        <span className={compact ? 'text-sm text-[var(--text)]' : 'text-lg text-[var(--text)]'}>
          Or drag and drop
        </span>
        <span className="font-mono text-xs text-[var(--text-tertiary)]">
          PNG / JPG / WebP - processed entirely on your device
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
