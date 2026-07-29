import { useEffect, useRef, useState } from 'react'

const DEFAULT_COLOR = '#22d3ee'
const ACCEPTED_BG_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Interactive result view shown once the dissolve effect completes.
 * Plain <canvas> + <img>, no WebGL. Background swap: transparent, any solid
 * color (native color picker), or a custom uploaded image (cover-fit).
 * Gradient, blur-original, and the edge-refinement slider are still out of
 * scope for this pass.
 */
export default function ResultView({ resultSrc, fileName }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const fileInputRef = useRef(null)

  const [bgMode, setBgMode] = useState('transparent') // 'transparent' | 'color' | 'custom'
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [customColor, setCustomColor] = useState(DEFAULT_COLOR)
  const [customBgUrl, setCustomBgUrl] = useState(null)
  const [customBgImg, setCustomBgImg] = useState(null)
  const [bgError, setBgError] = useState(null)

  // Load the cutout result.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setDims({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = resultSrc
    return () => {
      imgRef.current = null
    }
  }, [resultSrc])

  // Load the custom background image whenever a new one is picked.
  useEffect(() => {
    if (!customBgUrl) {
      setCustomBgImg(null)
      return
    }
    const img = new Image()
    img.onload = () => setCustomBgImg(img)
    img.src = customBgUrl
    return () => {
      setCustomBgImg(null)
    }
  }, [customBgUrl])

  // Revoke the custom bg object URL on unmount / replacement.
  useEffect(() => {
    return () => {
      if (customBgUrl) URL.revokeObjectURL(customBgUrl)
    }
  }, [customBgUrl])

  // Composite: background (none / color / custom image) + cutout on top.
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !dims.width) return

    canvas.width = dims.width
    canvas.height = dims.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dims.width, dims.height)

    if (bgMode === 'color') {
      ctx.fillStyle = customColor
      ctx.fillRect(0, 0, dims.width, dims.height)
    } else if (bgMode === 'custom' && customBgImg) {
      drawCover(ctx, customBgImg, dims.width, dims.height)
    }

    ctx.drawImage(img, 0, 0, dims.width, dims.height)
  }, [bgMode, dims, customColor, customBgImg])

  const handleColorChange = (e) => {
    setCustomColor(e.target.value)
    setBgMode('color')
  }

  const handleCustomFile = (file) => {
    if (!file) return
    if (!ACCEPTED_BG_TYPES.includes(file.type)) {
      setBgError('Use a PNG, JPG, or WEBP image.')
      return
    }
    setBgError(null)
    if (customBgUrl) URL.revokeObjectURL(customBgUrl)
    setCustomBgUrl(URL.createObjectURL(file))
    setBgMode('custom')
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const base = fileName ? fileName.replace(/\.[^.]+$/, '') : 'cleave-cutout'
      a.href = url
      a.download = `${base}-cleave.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)]"
        style={
          bgMode === 'transparent'
            ? {
                backgroundImage:
                  'linear-gradient(45deg, var(--elevated) 25%, transparent 25%), linear-gradient(-45deg, var(--elevated) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--elevated) 75%), linear-gradient(-45deg, transparent 75%, var(--elevated) 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                backgroundColor: 'var(--surface)',
              }
            : undefined
        }
      >
        <canvas ref={canvasRef} className="block w-full" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          background
        </span>

        <SwatchButton
          label="Transparent"
          active={bgMode === 'transparent'}
          onClick={() => setBgMode('transparent')}
        />

        <ColorSwatchButton
          active={bgMode === 'color'}
          color={customColor}
          onChange={handleColorChange}
        />

        <SwatchButton
          label="Custom"
          active={bgMode === 'custom'}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>

      {bgError && (
        <p className="font-mono text-xs text-[var(--danger)]">{bgError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_BG_TYPES.join(',')}
        onChange={(e) => {
          handleCustomFile(e.target.files?.[0])
          e.target.value = ''
        }}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleDownload}
        className="cursor-pointer rounded-md bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
      >
        Download PNG
      </button>
    </div>
  )
}

/** Draws `img` into the ctx cropped/scaled to cover w×h (CSS background-size: cover behavior). */
function drawCover(ctx, img, w, h) {
  const imgRatio = img.width / img.height
  const canvasRatio = w / h
  let sx, sy, sw, sh

  if (imgRatio > canvasRatio) {
    sh = img.height
    sw = sh * canvasRatio
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / canvasRatio
    sx = 0
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

function SwatchButton({ label, active, onClick, swatchColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-[var(--accent)] text-[var(--text)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
      ].join(' ')}
    >
      {swatchColor && (
        <span
          className="h-3 w-3 rounded-full border border-[var(--border-strong)]"
          style={{ backgroundColor: swatchColor }}
        />
      )}
      {label}
    </button>
  )
}

/** Same visual shell as SwatchButton, but the swatch itself is a native
 *  <input type="color"> so clicking it opens the OS color picker directly. */
function ColorSwatchButton({ active, color, onChange }) {
  return (
    <label
      className={[
        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-[var(--accent)] text-[var(--text)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
      ].join(' ')}
    >
      <span
        className="relative h-3 w-3 overflow-hidden rounded-full border border-[var(--border-strong)]"
        style={{ backgroundColor: color }}
      >
        <input
          type="color"
          value={color}
          onChange={onChange}
          className="absolute -left-1 -top-1 h-5 w-5 cursor-pointer opacity-0"
        />
      </span>
      Color
      <span className="font-mono text-xs text-[var(--text-tertiary)]">
        {color}
      </span>
    </label>
  )
}
