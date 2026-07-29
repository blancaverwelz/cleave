import * as THREE from 'three'

/**
 * Generates a grayscale procedural noise texture once (canvas + Math.random),
 * reused across dissolve plays. Not animated — the dissolve motion comes from
 * uProgress sweeping through this static field.
 */
export function createNoiseTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let i = 0; i < size * size; i++) {
    // Layer two frequencies of value-ish noise so the dissolve edge isn't
    // uniformly grainy — coarse blobs with fine grain on top.
    const x = i % size
    const y = Math.floor(i / size)
    const coarse = valueNoise(x / 48, y / 48)
    const fine = Math.random()
    const v = Math.floor((coarse * 0.65 + fine * 0.35) * 255)

    const idx = i * 4
    data[idx] = v
    data[idx + 1] = v
    data[idx + 2] = v
    data[idx + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

// Cheap deterministic pseudo-value-noise (no external dependency needed for
// a one-time bake at fixed resolution).
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function valueNoise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const tl = hash(xi, yi)
  const tr = hash(xi + 1, yi)
  const bl = hash(xi, yi + 1)
  const br = hash(xi + 1, yi + 1)

  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)

  const top = tl + (tr - tl) * u
  const bottom = bl + (br - bl) * u
  return top + (bottom - top) * v
}
