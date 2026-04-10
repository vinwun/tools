import { messagesByLocale, type Locale } from '../../../i18n'
import { setCanvasSize } from '../../foundations/canvas.ts'
import { stripExtension } from '../../foundations/file-converter/utils'
import { decodeAudioFile, encodeWav, readAudioSampleRate, resampleChannelData } from '../audio-utils.ts'
import type { AudioTrimmerElements, AudioTrimmerHandle, AudioTrimmerMode, AudioTrimmerState } from './types.ts'
import {
  buildTrimmerChannelData,
  clamp,
  computePeaks,
  drawWaveform,
  formatTime,
  getWaveformBarCount,
  normalizeSelection,
  MIN_SELECTION_SECONDS,
  parseTimeInput,
  renderTrimmerSelectionLabel,
} from './utils.ts'

export const mountAudioTrimmer = (container: HTMLElement, locale: Locale): void => {
  const messages = messagesByLocale[locale]
  const root = container.querySelector<HTMLElement>('[data-audio-trimmer-root]')
  if (!root) {
    return
  }

  const elements: AudioTrimmerElements = {
    fileInput: root.querySelector<HTMLInputElement>('[data-audio-trimmer-file]') as HTMLInputElement,
    browseButton: root.querySelector<HTMLButtonElement>('[data-audio-trimmer-browse]') as HTMLButtonElement,
    dropzone: root.querySelector<HTMLElement>('[data-audio-trimmer-dropzone]') as HTMLElement,
    fileName: root.querySelector<HTMLElement>('[data-audio-trimmer-file-name]') as HTMLElement,
    status: root.querySelector<HTMLElement>('[data-audio-trimmer-status]') as HTMLElement,
    summary: root.querySelector<HTMLElement>('[data-audio-trimmer-summary]') as HTMLElement,
    waveformCanvas: root.querySelector<HTMLCanvasElement>('[data-audio-trimmer-waveform]') as HTMLCanvasElement,
    selectionOverlay: root.querySelector<HTMLElement>('[data-audio-trimmer-selection]') as HTMLElement,
    startHandle: root.querySelector<HTMLElement>('[data-audio-trimmer-start-handle]') as HTMLElement,
    endHandle: root.querySelector<HTMLElement>('[data-audio-trimmer-end-handle]') as HTMLElement,
    modeInputs: Array.from(root.querySelectorAll<HTMLInputElement>('[data-audio-trimmer-mode]')),
    startInput: root.querySelector<HTMLInputElement>('[data-audio-trimmer-start]') as HTMLInputElement,
    endInput: root.querySelector<HTMLInputElement>('[data-audio-trimmer-end]') as HTMLInputElement,
    preview: root.querySelector<HTMLAudioElement>('[data-audio-trimmer-preview]') as HTMLAudioElement,
    downloadLink: root.querySelector<HTMLAnchorElement>('[data-audio-trimmer-download]') as HTMLAnchorElement,
  }

  if (
    !elements.fileInput ||
    !elements.browseButton ||
    !elements.dropzone ||
    !elements.fileName ||
    !elements.status ||
    !elements.summary ||
    !elements.waveformCanvas ||
    !elements.selectionOverlay ||
    !elements.startHandle ||
    !elements.endHandle ||
    elements.modeInputs.length === 0 ||
    !elements.startInput ||
    !elements.endInput ||
    !elements.preview ||
    !elements.downloadLink
  ) {
    return
  }

  const state: AudioTrimmerState = {
    fileName: '',
    audioBuffer: null,
    duration: 0,
    outputSampleRate: 0,
    mode: 'keep',
    start: 0,
    end: 0,
    peaks: [],
    previewUrl: null,
  }

  const dragState: { handle: AudioTrimmerHandle | null; pointerId: number | null } = {
    handle: null,
    pointerId: null,
  }

  const setDownloadState = (enabled: boolean): void => {
    elements.downloadLink.classList.toggle('is-disabled', !enabled)
    elements.downloadLink.setAttribute('aria-disabled', enabled ? 'false' : 'true')
  }

  const revokePreviewUrl = (): void => {
    if (!state.previewUrl) {
      return
    }

    URL.revokeObjectURL(state.previewUrl)
    state.previewUrl = null
  }

  const syncTimeFields = (): void => {
    elements.startInput.value = formatTime(state.start)
    elements.endInput.value = formatTime(state.end)
    elements.startInput.removeAttribute('data-invalid')
    elements.endInput.removeAttribute('data-invalid')
    elements.startInput.removeAttribute('aria-invalid')
    elements.endInput.removeAttribute('aria-invalid')
  }

  const markTimeFieldValidity = (input: HTMLInputElement): void => {
    const isInvalid = parseTimeInput(input.value) === null && input.value.trim() !== ''
    input.toggleAttribute('data-invalid', isInvalid)
    input.toggleAttribute('aria-invalid', isInvalid)
  }

  const updateTimeReadouts = (): void => {
    elements.summary.textContent = renderTrimmerSelectionLabel(messages, state.mode, state.start, state.end, state.duration)
  }

  const updateWaveformSelection = (): void => {
    const duration = Math.max(state.duration, 0)
    const startRatio = duration === 0 ? 0 : clamp(state.start / duration, 0, 1)
    const endRatio = duration === 0 ? 1 : clamp(state.end / duration, 0, 1)

    elements.selectionOverlay.style.left = `${startRatio * 100}%`
    elements.selectionOverlay.style.width = `${Math.max(0, (endRatio - startRatio) * 100)}%`
    elements.startHandle.style.left = `${startRatio * 100}%`
    elements.endHandle.style.left = `${endRatio * 100}%`
  }

  const drawCurrentWaveform = (): void => {
    if (!state.audioBuffer || state.peaks.length === 0) {
      const { width, height } = setCanvasSize(elements.waveformCanvas)
      const context = elements.waveformCanvas.getContext('2d')
      if (context) {
        context.clearRect(0, 0, width, height)
        context.fillStyle = '#F9FAFB'
        context.fillRect(0, 0, width, height)
      }
      updateWaveformSelection()
      return
    }

    drawWaveform(
      elements.waveformCanvas,
      state.peaks,
      {
        start: state.duration === 0 ? 0 : clamp(state.start / state.duration, 0, 1),
        end: state.duration === 0 ? 1 : clamp(state.end / state.duration, 0, 1),
      },
      state.mode,
    )
    updateWaveformSelection()
  }

  const updatePreview = (): void => {
    const audioBuffer = state.audioBuffer

    if (!audioBuffer) {
      revokePreviewUrl()
      elements.preview.removeAttribute('src')
      elements.preview.load()
      elements.downloadLink.removeAttribute('href')
      elements.downloadLink.removeAttribute('download')
      setDownloadState(false)
      return
    }

    revokePreviewUrl()

    const trimmerChannelData = buildTrimmerChannelData(audioBuffer, state.start, state.end, state.mode)
    const wavChannelData =
      state.outputSampleRate > 0 && state.outputSampleRate !== audioBuffer.sampleRate
        ? trimmerChannelData.map((channelData) =>
            resampleChannelData(channelData, audioBuffer.sampleRate, state.outputSampleRate),
          )
        : trimmerChannelData
    const wavBuffer = encodeWav(wavChannelData, state.outputSampleRate || audioBuffer.sampleRate)
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
    state.previewUrl = URL.createObjectURL(wavBlob)

    elements.preview.src = state.previewUrl
    elements.preview.load()

    const downloadSuffix = state.mode === 'keep' ? 'trimmed' : 'removed'
    elements.downloadLink.href = state.previewUrl
    elements.downloadLink.download = `${stripExtension(state.fileName || 'audio')}_${downloadSuffix}.wav`
    setDownloadState(true)

    const selectedDuration = state.mode === 'keep' ? Math.max(0, state.end - state.start) : Math.max(0, state.duration - (state.end - state.start))
    const isSilent = state.mode === 'remove' && selectedDuration === 0
    elements.status.textContent = isSilent ? messages.audioTrimmer.emptySelectionWarning : messages.audioTrimmer.statusReady
  }

  const setSelection = (start: number, end: number): void => {
    const normalized = normalizeSelection(start, end, state.duration)
    state.start = normalized.start
    state.end = normalized.end
    syncTimeFields()
    updateTimeReadouts()
    drawCurrentWaveform()
    updatePreview()
  }

  const setSelectionForHandle = (handle: AudioTrimmerHandle, nextTime: number): void => {
    if (state.duration <= 0) {
      return
    }

    if (handle === 'start') {
      const maxStart = Math.max(0, state.end - MIN_SELECTION_SECONDS)
      const nextStart = clamp(nextTime, 0, maxStart)
      setSelection(nextStart, state.end)
      return
    }

    const minEnd = Math.min(state.duration, state.start + MIN_SELECTION_SECONDS)
    const nextEnd = clamp(nextTime, minEnd, state.duration)
    setSelection(state.start, nextEnd)
  }

  const getTimeFromPointerX = (clientX: number): number => {
    const rect = elements.waveformCanvas.getBoundingClientRect()
    if (rect.width <= 0 || state.duration <= 0) {
      return 0
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * state.duration
  }

  const beginDrag = (handle: AudioTrimmerHandle, pointerId: number): void => {
    dragState.handle = handle
    dragState.pointerId = pointerId
    document.body.style.userSelect = 'none'
    root.classList.add('audio-trimmer-is-dragging')
  }

  const endDrag = (): void => {
    dragState.handle = null
    dragState.pointerId = null
    document.body.style.userSelect = ''
    root.classList.remove('audio-trimmer-is-dragging')
  }

  const updateDragSelection = (clientX: number): void => {
    if (!dragState.handle) {
      return
    }

    setSelectionForHandle(dragState.handle, getTimeFromPointerX(clientX))
  }

  const setMode = (mode: AudioTrimmerMode): void => {
    state.mode = mode
    updateTimeReadouts()
    drawCurrentWaveform()
    updatePreview()
  }

  const setControlsEnabled = (enabled: boolean): void => {
    elements.startInput.disabled = !enabled
    elements.endInput.disabled = !enabled
    elements.modeInputs.forEach((input) => {
      input.disabled = !enabled
    })
  }

  const loadFile = async (file: File): Promise<void> => {
    elements.fileName.textContent = file.name
    elements.status.textContent = messages.audioTrimmer.statusLoading
    setDownloadState(false)
    setControlsEnabled(false)

    try {
      const targetSampleRate = await readAudioSampleRate(file)
      const audioBuffer = await decodeAudioFile(file, targetSampleRate ?? undefined)
      state.fileName = file.name
      state.audioBuffer = audioBuffer
      state.duration = audioBuffer.duration
      state.outputSampleRate = targetSampleRate ?? audioBuffer.sampleRate
      state.mode = 'keep'
      state.start = 0
      state.end = audioBuffer.duration
      state.peaks = computePeaks(audioBuffer, getWaveformBarCount(elements.waveformCanvas))

      elements.modeInputs.forEach((input) => {
        input.checked = input.value === 'keep'
      })
      elements.startInput.min = '0'
      elements.startInput.max = state.duration.toFixed(2)
      elements.endInput.min = '0'
      elements.endInput.max = state.duration.toFixed(2)
      syncTimeFields()

      setControlsEnabled(true)
      updateTimeReadouts()
      drawCurrentWaveform()
      updatePreview()
    } catch {
      state.fileName = ''
      state.audioBuffer = null
      state.duration = 0
      state.outputSampleRate = 0
      state.peaks = []
      state.start = 0
      state.end = 0
      revokePreviewUrl()
      elements.preview.removeAttribute('src')
      elements.preview.load()
      elements.downloadLink.removeAttribute('href')
      elements.downloadLink.removeAttribute('download')
      elements.fileName.textContent = messages.audioTrimmer.noFileSelected
      elements.summary.textContent = messages.audioTrimmer.statusError
      elements.status.textContent = messages.audioTrimmer.statusError
      drawCurrentWaveform()
      setControlsEnabled(false)
    }
  }

  const handleSelectedFiles = (files: FileList | null): void => {
    const selectedFile = files?.[0]
    if (!selectedFile) {
      return
    }

    void loadFile(selectedFile)
  }

  elements.browseButton.addEventListener('click', (event) => {
    event.stopPropagation()
    elements.fileInput.click()
  })

  elements.fileInput.addEventListener('change', () => {
    handleSelectedFiles(elements.fileInput.files)
  })

  elements.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
  })

  elements.dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    handleSelectedFiles(event.dataTransfer?.files ?? null)
  })

  elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click()
  })

  elements.startInput.addEventListener('input', () => {
    markTimeFieldValidity(elements.startInput)
  })

  elements.endInput.addEventListener('input', () => {
    markTimeFieldValidity(elements.endInput)
  })

  elements.startInput.addEventListener('blur', () => {
    const parsed = parseTimeInput(elements.startInput.value)
    if (parsed === null) {
      syncTimeFields()
      return
    }

    setSelection(parsed, state.end)
  })

  elements.endInput.addEventListener('blur', () => {
    const parsed = parseTimeInput(elements.endInput.value)
    if (parsed === null) {
      syncTimeFields()
      return
    }

    setSelection(state.start, parsed)
  })

  elements.startInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    elements.startInput.blur()
  })

  elements.endInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    elements.endInput.blur()
  })

  elements.modeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) {
        return
      }

      setMode(input.value === 'remove' ? 'remove' : 'keep')
    })
  })

  elements.startHandle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    elements.startHandle.setPointerCapture(event.pointerId)
    beginDrag('start', event.pointerId)
    updateDragSelection(event.clientX)
  })

  elements.endHandle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    elements.endHandle.setPointerCapture(event.pointerId)
    beginDrag('end', event.pointerId)
    updateDragSelection(event.clientX)
  })

  elements.waveformCanvas.addEventListener('pointerdown', (event) => {
    if (state.duration <= 0) {
      return
    }

    const time = getTimeFromPointerX(event.clientX)
    const startDistance = Math.abs(time - state.start)
    const endDistance = Math.abs(time - state.end)
    beginDrag(startDistance <= endDistance ? 'start' : 'end', event.pointerId)
    updateDragSelection(event.clientX)
  })

  window.addEventListener('pointermove', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    updateDragSelection(event.clientX)
  })

  window.addEventListener('pointerup', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    endDrag()
  })

  window.addEventListener('pointercancel', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    endDrag()
  })

  window.addEventListener('resize', () => {
    drawCurrentWaveform()
  })

  syncTimeFields()
  elements.fileName.textContent = messages.audioTrimmer.noFileSelected
  elements.status.textContent = messages.audioTrimmer.statusNoFile
  elements.summary.textContent = messages.audioTrimmer.statusNoFile
  elements.preview.removeAttribute('src')
  elements.downloadLink.removeAttribute('href')
  elements.downloadLink.removeAttribute('download')
  setDownloadState(false)
  setControlsEnabled(false)
  drawCurrentWaveform()
}
