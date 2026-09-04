import { GlobalWorkerOptions } from 'pdfjs-dist'

let isWorkerConfigured = false

// Both PDF tools are imported on demand, so the worker path has to be set once the
// chunk has arrived instead of at module-evaluation time of the initial bundle.
export const configurePdfWorker = (): void => {
  if (isWorkerConfigured) {
    return
  }

  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  isWorkerConfigured = true
}
