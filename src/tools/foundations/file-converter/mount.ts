import type { ConverterMessages, FileConverterConfig, ConverterResultData } from './types.ts'

type PreviewItem =
  | { kind: 'success'; data: ConverterResultData }
  | { kind: 'error'; fileName: string; message: string }

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

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
            <p class="file-converter-preview-item-message">${escapeHtml(item.message)}</p>
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
  `<p class="file-converter-preview-message">${message}</p>`

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
  messages: ConverterMessages,
): void => {
  const fileInput = root.querySelector<HTMLInputElement>('[data-file-converter-file]')
  const fileButton = root.querySelector<HTMLButtonElement>('[data-file-converter-file-button]')
  const fileNameElement = root.querySelector<HTMLElement>('[data-file-converter-file-name]')
  const outputSelect = root.querySelector<HTMLSelectElement>('[data-file-converter-output]')
  const previewElement = root.querySelector<HTMLElement>('[data-file-converter-preview]')
  const downloadLink = root.querySelector<HTMLAnchorElement>('[data-file-converter-download]')
  const dropzoneElement = root.querySelector<HTMLElement>('[data-file-converter-dropzone]')

  if (!fileInput || !fileButton || !fileNameElement || !outputSelect || !previewElement || !downloadLink || !dropzoneElement) {
    return
  }

  let downloadableResults: ConverterResultData[] = []
  let currentPreviewItems: PreviewItem[] = []
  let selectedFiles: File[] = []
  let dropzoneDragDepth = 0

  const setDropzoneActive = (isActive: boolean): void => {
    dropzoneElement.classList.toggle('is-dragover', isActive)
  }

  const setSelectedFiles = (files: readonly File[]): void => {
    selectedFiles = [...files]
    setSelectedFileLabel(selectedFiles)
    syncFileInputFromSelectedFiles()
    void runConversion()
  }

  const syncFileInputFromSelectedFiles = (): void => {
    if (typeof DataTransfer === 'undefined') {
      return
    }

    const transfer = new DataTransfer()
    selectedFiles.forEach((file) => {
      transfer.items.add(file)
    })

    fileInput.files = transfer.files
  }

  const setDownloadDisabled = (): void => {
    downloadableResults = []
    downloadLink.ariaDisabled = 'true'
    downloadLink.classList.add('is-disabled')
  }

  const setDownloadEnabled = (results: readonly ConverterResultData[]): void => {
    downloadableResults = [...results]
    downloadLink.ariaDisabled = 'false'
    downloadLink.classList.remove('is-disabled')
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
      fileNameElement.textContent = messages.noFileSelected
      return
    }

    if (files.length === 1) {
      fileNameElement.textContent = files[0].name
      return
    }

    fileNameElement.textContent = messages.selectedFilesLabel.replace('{count}', String(files.length))
  }

  const getFailureMessage = (details?: string): string =>
    details ? `${messages.statusFailed}: ${details}` : messages.statusFailed

  const triggerDownloadForResult = (result: ConverterResultData): void => {
    const downloadUrl = URL.createObjectURL(result.blob)
    const tempLink = document.createElement('a')
    tempLink.href = downloadUrl
    tempLink.download = result.fileName
    tempLink.style.display = 'none'

    document.body.append(tempLink)
    tempLink.click()
    tempLink.remove()

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl)
    }, 1000)
  }

  downloadLink.textContent = messages.downloadAllAction
  setDownloadDisabled()
  setSelectedFileLabel([])

  downloadLink.addEventListener('click', (event) => {
    event.preventDefault()

    if (downloadLink.classList.contains('is-disabled')) {
      return
    }

    downloadableResults.forEach((result) => {
      triggerDownloadForResult(result)
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
    syncFileInputFromSelectedFiles()

    if (nextItems.length === 0) {
      setPreviewMessage(messages.statusNoFile)
      setDownloadDisabled()
      return
    }

    setPreviewItems(nextItems)
    syncDownloadFromPreviewItems()
  })

  fileButton.addEventListener('click', () => {
    fileInput.click()
  })

  dropzoneElement.addEventListener('dragenter', (event) => {
    event.preventDefault()
    dropzoneDragDepth += 1
    setDropzoneActive(true)
  })

  dropzoneElement.addEventListener('dragover', (event) => {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'copy'
    setDropzoneActive(true)
  })

  dropzoneElement.addEventListener('dragleave', (event) => {
    event.preventDefault()
    dropzoneDragDepth = Math.max(0, dropzoneDragDepth - 1)

    if (dropzoneDragDepth === 0) {
      setDropzoneActive(false)
    }
  })

  dropzoneElement.addEventListener('drop', (event) => {
    event.preventDefault()
    dropzoneDragDepth = 0
    setDropzoneActive(false)

    const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
    if (droppedFiles.length === 0) {
      return
    }

    setSelectedFiles(droppedFiles)
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

      const failureMessage =
        result.reason === 'unsupportedOutput'
          ? messages.statusUnsupported
          : getFailureMessage(result.details)

      previewItems.push({
        kind: 'error',
        fileName: file.name,
        message: failureMessage,
      })
    })

    setPreviewItems(previewItems)
    syncDownloadFromPreviewItems()
  }

  fileInput.addEventListener('change', () => {
    setSelectedFiles(Array.from(fileInput.files ?? []))
  })

  outputSelect.addEventListener('change', () => {
    void runConversion()
  })
}

