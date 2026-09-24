import { escapeHtml, formatMessage, queryRequired } from '../dom.ts'
import { downloadBlob, formatAcceptList } from '../files.ts'
import { wireFilePicker } from '../file-picker/mount.ts'
import type { ConverterMessages, FileConverterConfig, ConverterResultData } from './types.ts'

type PreviewItem =
  | { kind: 'success'; data: ConverterResultData }
  | { kind: 'error'; fileName: string; reason: 'unsupportedOutput' | 'conversionFailed' }

const createPreviewContentMarkup = (data: ConverterResultData, messages: ConverterMessages): string => {
  const previewUrl = URL.createObjectURL(data.blob)
  const escapedFileName = escapeHtml(data.fileName)

  if (data.previewKind === 'image') {
    return `<img src="${previewUrl}" alt="${escapedFileName}" class="file-converter-preview-image" data-preview-url="${previewUrl}" />`
  }

  if (data.previewKind === 'audio') {
    return `<audio src="${previewUrl}" controls class="file-converter-preview-audio" data-preview-url="${previewUrl}"></audio>`
  }

  return `<p>${messages.previewUnavailable}</p>`
}

const createPreviewListMarkup = (items: readonly PreviewItem[], messages: ConverterMessages): string =>
  `<div class="file-converter-preview-list">${items
    .map((item, index) => {
      const itemFileName = item.kind === 'success' ? item.data.fileName : item.fileName
      const removeAriaLabel = `${messages.removePreviewItemAction}: ${itemFileName}`

      if (item.kind === 'error') {
        return `
          <article class="file-converter-preview-item file-converter-preview-item-error">
            <header class="file-converter-preview-item-header">
              <h3 class="file-converter-preview-item-title">${escapeHtml(item.fileName)}</h3>
              <button
                type="button"
                class="file-converter-preview-item-remove"
                data-preview-remove-index="${index}"
                aria-label="${escapeHtml(removeAriaLabel)}"
              >×</button>
            </header>
            <p class="file-converter-preview-item-message">${item.reason === 'unsupportedOutput' ? messages.statusUnsupported : messages.statusFailed}</p>
          </article>
        `
      }

      return `
        <article class="file-converter-preview-item">
          <header class="file-converter-preview-item-header">
            <h3 class="file-converter-preview-item-title">${escapeHtml(item.data.fileName)}</h3>
            <button
              type="button"
              class="file-converter-preview-item-remove"
              data-preview-remove-index="${index}"
              aria-label="${escapeHtml(removeAriaLabel)}"
            >×</button>
          </header>
          <div class="file-converter-preview-item-content">
            ${createPreviewContentMarkup(item.data, messages)}
          </div>
        </article>
      `
    })
    .join('')}</div>`

const createPreviewMessageMarkup = (message: string): string =>
  `<p class="file-converter-preview-message" data-file-converter-preview-message>${message}</p>`

// Same shape as `MountedTool`, but relabels from the converter's own message group.
type FileConverterMount = {
  updateLocale?: (messages: ConverterMessages) => void
  destroy?: () => void
}

const revokePreviewUrls = (previewElement: HTMLElement): void => {
  previewElement.querySelectorAll<HTMLElement>('[data-preview-url]').forEach((element) => {
    const url = element.dataset.previewUrl
    if (url) {
      URL.revokeObjectURL(url)
    }
  })
}

export const mountFileConverter = (
  root: HTMLElement,
  config: FileConverterConfig,
  initialMessages: ConverterMessages,
): FileConverterMount => {
  const filePicker = wireFilePicker(root, { onFiles: (files) => setSelectedFiles(files) })
  const elements = queryRequired<{
    outputSelect: HTMLSelectElement
    previewElement: HTMLElement
    downloadButton: HTMLButtonElement
    uploadLabel: HTMLElement
    uploadHint: HTMLElement
    outputLabel: HTMLElement
    previewTitle: HTMLElement
  }>(root, {
    outputSelect: '[data-file-converter-output]',
    previewElement: '[data-file-converter-preview]',
    downloadButton: '[data-file-converter-download]',
    uploadLabel: '[data-file-converter-upload-label]',
    uploadHint: '[data-file-converter-upload-hint]',
    outputLabel: '[data-file-converter-output-label]',
    previewTitle: '[data-file-converter-preview-title]',
  })

  if (!filePicker || !elements) {
    return {}
  }

  const { outputSelect, previewElement, downloadButton } = elements

  let messages = initialMessages
  let downloadableResults: ConverterResultData[] = []
  let currentPreviewItems: PreviewItem[] = []
  let selectedFiles: File[] = []

  const setSelectedFiles = (files: readonly File[]): void => {
    selectedFiles = [...files]
    setSelectedFileLabel(selectedFiles)
    void runConversion()
  }

  const setDownloadDisabled = (): void => {
    downloadableResults = []
    downloadButton.disabled = true
  }

  const setDownloadEnabled = (results: readonly ConverterResultData[]): void => {
    downloadableResults = [...results]
    downloadButton.disabled = false
  }

  const setPreviewMessage = (message: string): void => {
    currentPreviewItems = []
    revokePreviewUrls(previewElement)
    previewElement.innerHTML = createPreviewMessageMarkup(message)
  }

  const setPreviewItems = (items: readonly PreviewItem[]): void => {
    currentPreviewItems = [...items]
    revokePreviewUrls(previewElement)
    previewElement.innerHTML = createPreviewListMarkup(items, messages)
  }

  const getSuccessfulResults = (items: readonly PreviewItem[]): ConverterResultData[] =>
    items
      .filter((item): item is Extract<PreviewItem, { kind: 'success' }> => item.kind === 'success')
      .map((item) => item.data)

  const syncDownloadFromPreviewItems = (): void => {
    const successfulResults = getSuccessfulResults(currentPreviewItems)

    if (successfulResults.length === 0) {
      setDownloadDisabled()
      return
    }

    setDownloadEnabled(successfulResults)
  }

  const setSelectedFileLabel = (files: readonly File[]): void => {
    if (files.length === 0) {
      filePicker.setName(messages.noFileSelected)
      return
    }

    if (files.length === 1) {
      filePicker.setName(files[0].name)
      return
    }

    filePicker.setName(formatMessage(messages.selectedFilesLabel, { count: files.length }))
  }

  setDownloadDisabled()
  setSelectedFileLabel([])

  const syncStaticTexts = (): void => {
    elements.uploadLabel.textContent = messages.uploadLabel
    elements.uploadHint.textContent = `${messages.uploadHintLabel}: ${formatAcceptList(config.inputAccept)}`
    filePicker.browseButton.textContent = messages.browseAction
    elements.outputLabel.textContent = messages.outputLabel
    elements.previewTitle.textContent = messages.previewTitle
    downloadButton.textContent = messages.downloadAllAction
  }

  const syncLocale = (nextMessages: ConverterMessages): void => {
    const previousMessages = messages
    messages = nextMessages
    syncStaticTexts()
    setSelectedFileLabel(selectedFiles)

    if (currentPreviewItems.length === 0) {
      const previewMessage = previewElement.querySelector<HTMLElement>('[data-file-converter-preview-message]')
      if (previewMessage) {
        const currentMessage = previewMessage.textContent ?? ''
        if (currentMessage === previousMessages.statusNoFile) {
          setPreviewMessage(messages.statusNoFile)
        } else if (currentMessage === previousMessages.converting) {
          setPreviewMessage(messages.converting)
        }
      }
      return
    }

    setPreviewItems(currentPreviewItems)
    syncDownloadFromPreviewItems()
  }

  downloadButton.addEventListener('click', () => {
    downloadableResults.forEach((result) => {
      downloadBlob(result.blob, result.fileName)
    })
  })

  previewElement.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const removeButton = target.closest<HTMLElement>('[data-preview-remove-index]')
    if (!removeButton) {
      return
    }

    const rawIndex = removeButton.dataset.previewRemoveIndex
    if (!rawIndex) {
      return
    }

    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    const nextItems = currentPreviewItems.filter((_, itemIndex) => itemIndex !== index)
    selectedFiles = selectedFiles.filter((_, fileIndex) => fileIndex !== index)
    setSelectedFileLabel(selectedFiles)

    if (nextItems.length === 0) {
      setPreviewMessage(messages.statusNoFile)
      setDownloadDisabled()
      return
    }

    setPreviewItems(nextItems)
    syncDownloadFromPreviewItems()
  })

  let conversionRequestId = 0

  const runConversion = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      setSelectedFileLabel([])
      setPreviewMessage(messages.statusNoFile)
      setDownloadDisabled()
      return
    }

    setSelectedFileLabel(selectedFiles)
    const requestId = ++conversionRequestId
    setPreviewMessage(messages.converting)

    const conversionResults = await Promise.all(
      selectedFiles.map(async (file) => ({
        file,
        result: await config.convert(file, outputSelect.value),
      })),
    )

    if (requestId !== conversionRequestId) {
      return
    }

    const previewItems: PreviewItem[] = []

    conversionResults.forEach(({ file, result }) => {
      if (result.ok) {
        previewItems.push({ kind: 'success', data: result.data })
        return
      }

      previewItems.push({ kind: 'error', fileName: file.name, reason: result.reason })
    })

    setPreviewItems(previewItems)
    syncDownloadFromPreviewItems()
  }

  outputSelect.addEventListener('change', () => {
    void runConversion()
  })

  return {
    updateLocale: syncLocale,
    destroy: () => {
      // A conversion still running must not write previews that nobody revokes.
      conversionRequestId += 1
      revokePreviewUrls(previewElement)
    },
  }
}
