import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createNoiseTexture } from '../lib/noiseTexture'
import dissolveFragmentShader from '../shaders/dissolve.frag.glsl?raw'

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const ACCENT_RGB = [0x22 / 255, 0xd3 / 255, 0xee / 255]

/**
 * Full-screen quad dissolve-reveal. OrthographicCamera + single plane mesh +
 * ShaderMaterial only — not a 3D scene. Mounted only while the effect plays;
 * caller unmounts this and swaps to a plain <canvas>/<img> once onComplete
 * fires (see ResultView).
 *
 * Props:
 *  - originalSrc: string (object URL / data URL of the source image)
 *  - resultSrc: string (object URL of the PNG cutout with alpha)
 *  - durationMs: number
 *  - onComplete: () => void
 */
export default function DissolveCanvas({
  originalSrc,
  resultSrc,
  durationMs = 2000,
  onComplete,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let frameId
    let disposed = false

    const width = container.clientWidth
    const height = container.clientHeight

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch (err) {
      // No WebGL support: skip the effect rather than leave a dead canvas.
      console.error('Cleave: WebGL unavailable, skipping dissolve', err)
      onComplete?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const scene = new THREE.Scene()

    const loader = new THREE.TextureLoader()
    const noiseTexture = createNoiseTexture(512)

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: dissolveFragmentShader,
      transparent: true,
      uniforms: {
        uOriginal: { value: null },
        uResult: { value: null },
        uNoise: { value: noiseTexture },
        uProgress: { value: 0 },
        uAccentColor: { value: new THREE.Vector3(...ACCENT_RGB) },
        uEdgeWidth: { value: 0.06 },
      },
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let startTime = null

    const animate = (time) => {
      if (disposed) return
      if (startTime === null) startTime = time
      const elapsed = time - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      material.uniforms.uProgress.value = progress

      renderer.render(scene, camera)

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      } else {
        onComplete?.()
      }
    }

    Promise.all([loader.loadAsync(originalSrc), loader.loadAsync(resultSrc)])
      .then(([originalTex, resultTex]) => {
        if (disposed) return
        originalTex.colorSpace = THREE.SRGBColorSpace
        resultTex.colorSpace = THREE.SRGBColorSpace
        material.uniforms.uOriginal.value = originalTex
        material.uniforms.uResult.value = resultTex
        frameId = requestAnimationFrame(animate)
      })
      .catch((err) => {
        console.error('Cleave: failed to load dissolve textures', err)
        onComplete?.()
      })

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)
      if (frameId) cancelAnimationFrame(frameId)
      geometry.dispose()
      material.dispose()
      noiseTexture.dispose()
      material.uniforms.uOriginal.value?.dispose()
      material.uniforms.uResult.value?.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalSrc, resultSrc, durationMs])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
