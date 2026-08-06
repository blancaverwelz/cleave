import { useRef } from 'react'
import { UploadIcon } from './icons.jsx'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Solid accent button that opens the file picker directly. Sits above the
 *  dropzone on the landing page, and above the dropzone in the result
 *  view's left sidebar — same trigger, same accepted types, everywhere. */
export default function UploadButton({ onFileSelected, className = '', children = 'Upload Image' }) {
  const inputRef = useRef(null)

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={[
          'flex cursor-pointer items-center justify-center gap-2 rounded-md',
          'bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-ink)]',
          'transition-opacity hover:opacity-90',
          className,
        ].join(' ')}
      >
        <UploadIcon size={18} />
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={onInputChange}
        className="hidden"
      />
    </>
  )
}
