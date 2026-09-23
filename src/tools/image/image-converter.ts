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
    jpg: { mimeType: 'image/jpeg', extension: 'jpg', quality: 1 },
    webp: { mimeType: 'image/webp', extension: 'webp', quality: 1 },
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
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) {
      return { ok: false, reason: 'conversionFailed', details: 'Canvas context unavailable' }
    }

    context.drawImage(image, 0, 0)
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
