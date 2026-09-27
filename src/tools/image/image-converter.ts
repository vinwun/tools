import type { FileConverterConfig, ConverterResult } from '../foundations/file-converter/types'
import { conversionFailed, createFileConverterTool } from '../foundations/file-converter/utils'
import { getFileExtension, stripExtension } from '../foundations/files.ts'

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const fileUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(fileUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(fileUrl)
      reject(new Error('Could not load image'))
    }

    image.src = fileUrl
  })

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image conversion failed'))
          return
        }

        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

const FALLBACK_SVG_SIZE = 1024

// An SVG without width/height has no intrinsic size in some browsers; its viewBox still gives the
// aspect ratio.
const getCanvasSize = async (file: File, image: HTMLImageElement): Promise<{ width: number; height: number }> => {
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return { width: image.naturalWidth, height: image.naturalHeight }
  }

  const viewBox = (await file.text()).match(/viewBox\s*=\s*["']([^"']*)["']/)?.[1] ?? ''
  const [, , viewBoxWidth, viewBoxHeight] = viewBox.trim().split(/[\s,]+/).map(Number)
  const ratio = viewBoxWidth > 0 && viewBoxHeight > 0 ? viewBoxWidth / viewBoxHeight : 1
  return ratio >= 1
    ? { width: FALLBACK_SVG_SIZE, height: Math.round(FALLBACK_SVG_SIZE / ratio) }
    : { width: Math.round(FALLBACK_SVG_SIZE * ratio), height: FALLBACK_SVG_SIZE }
}

const getImageFormatId = (file: File): string | null => {
  const extension = getFileExtension(file.name)

  if (file.type === 'image/png' || extension === 'png') return 'png'
  if (file.type === 'image/jpeg' || file.type === 'image/jpg' || extension === 'jpg' || extension === 'jpeg') return 'jpg'
  if (file.type === 'image/webp' || extension === 'webp') return 'webp'

  return null
}

const convertImageFile = async (file: File, outputFormatId: string): Promise<ConverterResult> => {
  const formatMap = {
    png: { mimeType: 'image/png', extension: 'png' },
    jpg: { mimeType: 'image/jpeg', extension: 'jpg', quality: 0.92 },
    webp: { mimeType: 'image/webp', extension: 'webp', quality: 0.92 },
  } as const

  if (!(outputFormatId in formatMap)) {
    return { ok: false, reason: 'unsupportedOutput' }
  }

  try {
    const outputFormat = formatMap[outputFormatId as keyof typeof formatMap]

    if (getImageFormatId(file) === outputFormatId) {
      return {
        ok: true,
        data: {
          blob: file,
          fileName: `${stripExtension(file.name)}.${outputFormat.extension}`,
          mimeType: outputFormat.mimeType,
          previewKind: 'image',
        },
      }
    }

    const image = await loadImage(file)
    const canvas = document.createElement('canvas')
    const { width, height } = await getCanvasSize(file, image)
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      return { ok: false, reason: 'conversionFailed' }
    }

    // JPEG has no alpha channel, so transparent areas would otherwise turn black.
    if (outputFormat.mimeType === 'image/jpeg') {
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, width, height)
    }

    context.drawImage(image, 0, 0, width, height)
    const quality = 'quality' in outputFormat ? outputFormat.quality : undefined
    const blob = await canvasToBlob(canvas, outputFormat.mimeType, quality)

    // A browser that cannot encode this type silently returns a PNG under the wanted extension.
    if (blob.type !== outputFormat.mimeType) {
      return { ok: false, reason: 'unsupportedOutput' }
    }

    return {
      ok: true,
      data: {
        blob,
        fileName: `${stripExtension(file.name)}.${outputFormat.extension}`,
        mimeType: outputFormat.mimeType,
        previewKind: 'image',
      },
    }
  } catch (error) {
    return conversionFailed(error)
  }
}

const imageConverterConfig: FileConverterConfig = {
  id: 'image',
  inputAccept: '.png, .jpg, .jpeg, .webp, .gif, .svg, .ico, .bmp',
  outputFormats: [
    { id: 'png', label: 'PNG' },
    { id: 'jpg', label: 'JPG' },
    { id: 'webp', label: 'WEBP' },
  ],
  convert: convertImageFile,
}

export const imageConverterTool = createFileConverterTool(imageConverterConfig)
