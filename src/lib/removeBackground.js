import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'

/**
 * Runs client-side background segmentation on a single image and returns a
 * PNG Blob with an alpha-cutout background. Never uploads the source image
 * — @imgly/background-removal runs the model in-browser via WASM/ONNX
 * Runtime Web. Model weights are fetched from imgly's CDN on first run and
 * cached by the browser; the user's photo itself never leaves the client.
 *
 * @param {File|Blob} file
 * @param {(progress: { key: string, current: number, total: number }) => void} [onProgress]
 * @returns {Promise<Blob>} PNG blob with transparent background
 */
export async function removeBackground(file, onProgress) {
  return imglyRemoveBackground(file, {
    progress: (key, current, total) => {
      onProgress?.({ key, current, total })
    },
  })
}

/** Convenience: Blob -> object URL, caller is responsible for revoking it. */
export function blobToObjectUrl(blob) {
  return URL.createObjectURL(blob)
}
