export type FilePickerHandle = {
  input: HTMLInputElement
  dropzone: HTMLElement
  browseButton: HTMLButtonElement
  // Tools whose dropzone shows a hint instead of a file name render no name element.
  setName: (text: string) => void
  open: () => void
}

export type FilePickerHandlers = {
  onFiles: (files: readonly File[]) => void
}

/**
 * Wires browse-click, change, and drag & drop for a picker rendered by `renderFilePicker`.
 *
 * `dragenter`/`dragleave` are counted rather than toggled: moving the pointer over a child
 * element fires a `dragleave` for the parent, which would otherwise drop the highlight while the
 * file is still hovering.
 */
export const wireFilePicker = (
  root: HTMLElement,
  { onFiles }: FilePickerHandlers,
): FilePickerHandle | null => {
  const dropzone = root.querySelector<HTMLElement>('[data-tool-file-picker]')
  const input = root.querySelector<HTMLInputElement>('[data-tool-file-picker-input]')
  const browseButton = root.querySelector<HTMLButtonElement>('[data-tool-file-picker-browse]')
  const nameElement = root.querySelector<HTMLElement>('[data-tool-file-picker-name]')

  if (!dropzone || !input || !browseButton) {
    return null
  }

  let dragDepth = 0

  const setDragActive = (isActive: boolean): void => {
    dropzone.classList.toggle('is-dragover', isActive)
  }

  const emit = (files: FileList | null): void => {
    const selected = Array.from(files ?? [])
    // Clearing lets the same file be picked again after a reset.
    input.value = ''
    if (selected.length > 0) {
      onFiles(selected)
    }
  }

  const open = (): void => {
    input.click()
  }

  browseButton.addEventListener('click', (event) => {
    event.stopPropagation()
    open()
  })

  dropzone.addEventListener('click', open)

  input.addEventListener('change', () => {
    emit(input.files)
  })

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault()
    dragDepth += 1
    setDragActive(true)
  })

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
    setDragActive(true)
  })

  dropzone.addEventListener('dragleave', (event) => {
    event.preventDefault()
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) {
      setDragActive(false)
    }
  })

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    dragDepth = 0
    setDragActive(false)
    emit(event.dataTransfer?.files ?? null)
  })

  return {
    input,
    dropzone,
    browseButton,
    setName: (text: string) => {
      if (nameElement) {
        nameElement.textContent = text
      }
    },
    open,
  }
}
