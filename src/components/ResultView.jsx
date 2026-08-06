import { useCallback, useEffect, useRef, useState } from 'react'
import Dropzone from './Dropzone.jsx'
import UploadButton from './UploadButton.jsx'
import {
  HandIcon,
  MinusIcon,
  PlusIcon,
  ExpandIcon,
  CollapseIcon,
} from './icons.jsx'

const DEFAULT_COLOR = '#006be8'
const ACCEPTED_BG_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const ZOOM_MIN = 25
const ZOOM_MAX = 400
const ZOOM_STEP = 25

// Export size presets, long edge in px. "Original" exports at native
// resolution (no resize pass).
const SIZE_OPTIONS = [
  { label: 'Original', value: 'original', longEdge: null },
  { label: 'Small', value: 'small', longEdge: 512 },
  { label: 'Medium', value: 'medium', longEdge: 1024 },
  { label: 'Large', value: 'large', longEdge: 2048 },
]

const FORMAT_OPTIONS = [
  { label: 'PNG', value: 'png', mime: 'image/png' },
  { label: 'JPG', value: 'jpg', mime: 'image/jpeg' },
  { label: 'WebP', value: 'webp', mime: 'image/webp' },
]

/**
 * Three-column result workspace: left = source/background controls,
 * center = original/result preview with pan, zoom & fullscreen, right =
 * export controls. Background compositing (transparent / color / custom
 * image) happens on a hidden <canvas>, same approach as before — only the
 * layout and controls around it are new.
 */
export default function ResultView({ originalSrc, resultSrc, fileName, onFileSelected }) {
  const canvasRef = useRef(null)
  const cutoutImgRef = useRef(null)
  const viewportRef = useRef(null)

  const [bgMode, setBgMode] = useState('transparent') // 'transparent' | 'color' | 'custom'
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [customColor, setCustomColor] = useState(DEFAULT_COLOR)
  const [customBgUrl, setCustomBgUrl] = useState(null)
  const [customBgImg, setCustomBgImg] = useState(null)
  const [bgError, setBgError] = useState(null)

  const [viewMode, setViewMode] = useState('result') // 'original' | 'result'
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [exportFormat, setExportFormat] = useState('png')
  const [exportSize, setExportSize] = useState('original')

  const fileInputRef = useRef(null)

  // Load the cutout result.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      cutoutImgRef.current = img
      setDims({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = resultSrc
    return () => {
      cutoutImgRef.current = null
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

  // Composite the on-screen preview: background (none / color / custom
  // image) + cutout on top. Transparent stays transparent here — the
  // checkerboard behind the <canvas> communicates it; white-fill only
  // happens at export time for formats that can't hold alpha.
  useEffect(() => {
    const canvas = canvasRef.current
    const img = cutoutImgRef.current
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

  // Reset pan/zoom whenever the view or the source image changes, so
  // switching tabs doesn't leave the next image awkwardly offset.
  useEffect(() => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }, [viewMode, resultSrc])

  // Track native fullscreen state (Esc key, browser chrome, etc. all fire
  // this event too, not just our own button).
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

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

  // --- Pan ---
  const onPointerDown = (e) => {
    if (zoom <= 100) return
    setIsPanning(true)
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!isPanning || !panStartRef.current) return
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    })
  }
  const onPointerUp = () => {
    setIsPanning(false)
    panStartRef.current = null
  }

  // --- Zoom ---
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
  const resetView = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }

  // --- Fullscreen ---
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      viewportRef.current?.requestFullscreen?.()
    }
  }

  // --- Export ---
  const handleDownload = useCallback(() => {
    const sourceImg = cutoutImgRef.current
    if (!sourceImg || !dims.width) return

    const format = FORMAT_OPTIONS.find((f) => f.value === exportFormat) ?? FORMAT_OPTIONS[0]
    const sizePreset = SIZE_OPTIONS.find((s) => s.value === exportSize) ?? SIZE_OPTIONS[0]

    // Work out target pixel dimensions from the long-edge preset.
    let targetW = dims.width
    let targetH = dims.height
    if (sizePreset.longEdge && sizePreset.longEdge < Math.max(dims.width, dims.height)) {
      const scale = sizePreset.longEdge / Math.max(dims.width, dims.height)
      targetW = Math.round(dims.width * scale)
      targetH = Math.round(dims.height * scale)
    }

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = targetW
    exportCanvas.height = targetH
    const ctx = exportCanvas.getContext('2d')

    // JPG can't hold transparency — fall back to a white fill so the
    // export doesn't silently turn black/undefined in other viewers.
    const needsOpaqueFallback = format.value === 'jpg' && bgMode === 'transparent'

    if (bgMode === 'color') {
      ctx.fillStyle = customColor
      ctx.fillRect(0, 0, targetW, targetH)
    } else if (bgMode === 'custom' && customBgImg) {
      drawCover(ctx, customBgImg, targetW, targetH)
    } else if (needsOpaqueFallback) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetW, targetH)
    }

    ctx.drawImage(sourceImg, 0, 0, targetW, targetH)

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const base = fileName ? fileName.replace(/\.[^.]+$/, '') : 'cleave-cutout'
        a.href = url
        a.download = `${base}-cleave.${format.value}`
        a.click()
        URL.revokeObjectURL(url)
      },
      format.mime,
      format.value === 'png' ? undefined : 0.92,
    )
  }, [dims, exportFormat, exportSize, bgMode, customColor, customBgImg, fileName])

  const zoomPct = Math.round(zoom)

  return (
    <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[260px_1fr_260px]">
      {/* Left column: source + background controls */}
      <div className="flex flex-col gap-4 order-1">
        <UploadButton onFileSelected={onFileSelected} className="w-full" />
        <Dropzone onFileSelected={onFileSelected} compact />

        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            Background
          </span>
          <div className="grid grid-cols-2 gap-2">
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
              className="col-span-2"
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
        </div>
      </div>

      {/* Center column: preview */}
      <div className="order-3 flex flex-col items-center gap-3 lg:order-2">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] p-1">
          <ViewTabButton
            label="Original"
            active={viewMode === 'original'}
            onClick={() => setViewMode('original')}
          />
          <ViewTabButton
            label="Background Removed"
            active={viewMode === 'result'}
            onClick={() => setViewMode('result')}
          />
        </div>

        <div
          ref={viewportRef}
          className={[
            'relative w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)]',
            isFullscreen ? 'flex h-screen max-w-none items-center justify-center bg-[var(--bg)]' : 'aspect-square',
            isPanning ? 'cursor-grabbing' : zoom > 100 ? 'cursor-grab' : 'cursor-default',
          ].join(' ')}
          style={
            viewMode === 'result' && bgMode === 'transparent'
              ? {
                  backgroundImage:
                    'linear-gradient(45deg, var(--elevated) 25%, transparent 25%), linear-gradient(-45deg, var(--elevated) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--elevated) 75%), linear-gradient(-45deg, transparent 75%, var(--elevated) 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: 'var(--surface)',
                }
              : { backgroundColor: 'var(--surface)' }
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transition: isPanning ? 'none' : 'transform 120ms ease-out',
            }}
          >
            <canvas
              ref={canvasRef}
              className={[
                'block max-h-full max-w-full select-none object-contain',
                viewMode === 'original' ? 'hidden' : '',
              ].join(' ')}
            />
            {viewMode === 'original' && (
              <img
                src={originalSrc}
                alt="Original upload"
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-md border border-[var(--border)] px-4 py-2">
          <button
            type="button"
            onClick={resetView}
            title="Reset pan & zoom"
            className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <HandIcon />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-30"
          >
            <MinusIcon />
          </button>
          <span className="w-12 text-center font-mono text-xs text-[var(--text-tertiary)]">
            {zoomPct}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-30"
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>

      {/* Right column: export controls */}
      <div className="order-2 flex flex-col gap-5 lg:order-3">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            Export
          </span>
          <div className="grid grid-cols-3 gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setExportFormat(f.value)}
                className={[
                  'cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors',
                  exportFormat === f.value
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            Size
          </span>
          <select
            value={exportSize}
            onChange={(e) => setExportSize(e.target.value)}
            className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
                {s.longEdge ? ` (${s.longEdge}px)` : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="cursor-pointer rounded-md bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
        >
          Download
        </button>
      </div>
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

function SwatchButton({ label, active, onClick, swatchColor, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-[var(--accent)] text-[var(--text)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
        className,
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
        'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
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
    </label>
  )
}

function ViewTabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'cursor-pointer rounded px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-[var(--elevated)] text-[var(--text)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
