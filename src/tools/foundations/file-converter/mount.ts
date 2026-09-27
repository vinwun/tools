import { escapeHtml, formatMessage, queryRequired } from '../dom.ts'
import { downloadBlob, formatAcceptList } from '../files.ts'
import { wireFilePicker } from '../file-picker/mount.ts'
import type { ConverterMessages, FileConverterConfig, ConverterResultData } from './types.ts'

// The preview URL lives as long as its item, so relabeling never reloads a playing preview.
type PreviewItem =
  | { kind: 'success'; data: ConverterResultData; previewUrl: string | null }
  | { kind: 'error'; fileName: string; reason: 'unsupportedOutput' | 'conversionFailed' }

const getItemFileName = (item: PreviewItem): string => (item.kind === 'success' ? item.data.fileName : item.fileName)

const getItemMessage = (item: PreviewItem, messages: ConverterMessages): string =>
  item.kind === 'success'
    ? messages.previewUnavailable
    : item.reason === 'unsupportedOutput'
      ? messages.statusUnsupported
      : messages.statusFailed

const revokeItemUrls = (items: readonly PreviewItem[]): void => {
  items.forEach((item) => {
    if (item.kind === 'success' && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  })
}

const createPreviewContentMarkup = (item: Extract<PreviewItem, { kind: 'success' }>, messages: ConverterMessages): string => {
  if (item.previewUrl && item.data.previewKind === 'image') {
    return `<img src="${item.previewUrl}" alt="${escapeHtml(item.data.fileName)}" class="file-converter-preview-image" />`
  }

  if (item.previewUrl && item.data.previewKind === 'audio') {
    return `<audio src="${item.previewUrl}" controls class="file-converter-preview-audio"></audio>`
  }

  return `<p data-file-converter-item-message>${getItemMessage(item, messages)}</p>`
}

const createPreviewListMarkup = (items: readonly PreviewItem[], messages: ConverterMessages): string =>
  `<div class="file-converter-preview-list">${items
    .map((item) => {
      const removeAriaLabel = `${messages.removePreviewItemAction}: ${getItemFileName(item)}`

      if (item.kind === 'error') {
        return `
          <article class="file-converter-preview-item file-converter-preview-item-error">
            <header class="file-converter-preview-item-header">
              <h3 class="file-converter-preview-item-title">${escapeHtml(item.fileName)}</h3>
              <button
                type="button"
                class="file-converter-preview-item-remove"
                data-preview-remove
                aria-label="${escapeHtml(removeAriaLabel)}"
              >×</button>
            </header>
            <p class="file-converter-preview-item-message" data-file-converter-item-message>${getItemMessage(item, messages)}</p>
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
              data-preview-remove
              aria-label="${escapeHtml(removeAriaLabel)}"
            >×</button>
          </header>
          <div class="file-converter-preview-item-content">
            ${createPreviewContentMarkup(item, messages)}
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
    previewElement.removeAttribute('aria-busy')
    revokeItemUrls(currentPreviewItems)
    currentPreviewItems = []
    previewElement.innerHTML = createPreviewMessageMarkup(message)
  }

  // New images have no size until decoded, so swapping them in right away collapsed the preview
  // for a few frames and made the layout jump; they are decoded off-screen first.
  const setPreviewItems = async (items: readonly PreviewItem[], requestId: number): Promise<void> => {
    const staging = document.createElement('div')
    staging.innerHTML = createPreviewListMarkup(items, messages)
    await Promise.all(Array.from(staging.querySelectorAll('img'), (image) => image.decode().catch(() => undefined)))
    if (requestId !== conversionRequestId) {
      revokeItemUrls(items)
      return
    }

    previewElement.removeAttribute('aria-busy')
    revokeItemUrls(currentPreviewItems)
    currentPreviewItems = [...items]
    previewElement.replaceChildren(...staging.childNodes)
  }

  // Relabels the rendered items in place, so a locale switch does not restart their previews.
  const syncPreviewItemTexts = (): void => {
    previewElement.querySelectorAll<HTMLElement>('.file-converter-preview-item').forEach((article, index) => {
      const item = currentPreviewItems[index]
      article
        .querySelector('[data-preview-remove]')
        ?.setAttribute('aria-label', `${messages.removePreviewItemAction}: ${getItemFileName(item)}`)
      const message = article.querySelector('[data-file-converter-item-message]')
      if (message) {
        message.textContent = getItemMessage(item, messages)
      }
    })
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

    syncPreviewItemTexts()
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

    const article = target.closest('[data-preview-remove]')?.closest<HTMLElement>('.file-converter-preview-item')
    if (!article) {
      return
    }

    // Only this item leaves the DOM, so the other previews keep playing.
    const index = Array.from(previewElement.querySelectorAll('.file-converter-preview-item')).indexOf(article)
    revokeItemUrls(currentPreviewItems.slice(index, index + 1))
    currentPreviewItems = currentPreviewItems.filter((_, itemIndex) => itemIndex !== index)
    selectedFiles = selectedFiles.filter((_, fileIndex) => fileIndex !== index)
    setSelectedFileLabel(selectedFiles)

    if (currentPreviewItems.length === 0) {
      setPreviewMessage(messages.statusNoFile)
      setDownloadDisabled()
      return
    }

    article.remove()
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
    // Earlier results stay (dimmed) until the new ones replace them, so the layout does not jump.
    if (currentPreviewItems.length > 0) {
      previewElement.setAttribute('aria-busy', 'true')
      setDownloadDisabled()
    } else {
      setPreviewMessage(messages.converting)
    }

    // One file at a time: decoding many large files at once can exhaust memory on phones.
    const previewItems: PreviewItem[] = []
    for (const file of selectedFiles) {
      const result = await config.convert(file, outputSelect.value)
      if (requestId !== conversionRequestId) {
        revokeItemUrls(previewItems)
        return
      }

      previewItems.push(
        result.ok
          ? {
              kind: 'success',
              data: result.data,
              previewUrl: result.data.previewKind === 'none' ? null : URL.createObjectURL(result.data.blob),
            }
          : { kind: 'error', fileName: file.name, reason: result.reason },
      )
    }

    await setPreviewItems(previewItems, requestId)
    if (requestId === conversionRequestId) {
      syncDownloadFromPreviewItems()
    }
  }

  outputSelect.addEventListener('change', () => {
    void runConversion()
  })

  return {
    updateLocale: syncLocale,
    destroy: () => {
      // A conversion still running must not write previews that nobody revokes.
      conversionRequestId += 1
      revokeItemUrls(currentPreviewItems)
    },
  }
}
