import { messagesByLocale, type Locale } from '../../../i18n'
import type { Messages } from '../../../i18n/schema.ts'
import { setCanvasSize } from '../../foundations/canvas.ts'
import { stripExtension } from '../../foundations/file-converter/utils'
import { ACCEPTED_AUDIO_TYPES, decodeAudioFile, encodeWav, readAudioSampleRate, resampleChannelData } from '../audio-utils.ts'
import type { AudioCutterElements, AudioCutterHandle, AudioCutterMode, AudioCutterState } from './types.ts'
import {
  buildCutterChannelData,
  clamp,
  computePeaks,
  drawWaveform,
  formatTime,
  getWaveformBarCount,
  normalizeSelection,
  MIN_SELECTION_SECONDS,
  parseTimeInput,
  renderCutterSelectionLabel,
} from './utils.ts'

const audioCutterLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)

export const mountAudioCutter = (container: HTMLElement, locale: Locale): void => {
  let messages = messagesByLocale[locale]
  const root = container.querySelector<HTMLElement>('[data-audio-cutter-root]')
  if (!root) {
    return
  }

  const elements: AudioCutterElements = {
    fileInput: root.querySelector<HTMLInputElement>('[data-audio-cutter-file]') as HTMLInputElement,
    browseButton: root.querySelector<HTMLButtonElement>('[data-audio-cutter-browse]') as HTMLButtonElement,
    dropzone: root.querySelector<HTMLElement>('[data-audio-cutter-dropzone]') as HTMLElement,
    fileName: root.querySelector<HTMLElement>('[data-audio-cutter-file-name]') as HTMLElement,
    status: root.querySelector<HTMLElement>('[data-audio-cutter-status]') as HTMLElement,
    summary: root.querySelector<HTMLElement>('[data-audio-cutter-summary]') as HTMLElement,
    waveformCanvas: root.querySelector<HTMLCanvasElement>('[data-audio-cutter-waveform]') as HTMLCanvasElement,
    selectionOverlay: root.querySelector<HTMLElement>('[data-audio-cutter-selection]') as HTMLElement,
    playhead: root.querySelector<HTMLButtonElement>('[data-audio-cutter-playhead]') as HTMLButtonElement,
    startHandle: root.querySelector<HTMLElement>('[data-audio-cutter-start-handle]') as HTMLElement,
    endHandle: root.querySelector<HTMLElement>('[data-audio-cutter-end-handle]') as HTMLElement,
    modeInputs: Array.from(root.querySelectorAll<HTMLInputElement>('[data-audio-cutter-mode]')),
    startInput: root.querySelector<HTMLInputElement>('[data-audio-cutter-start]') as HTMLInputElement,
    endInput: root.querySelector<HTMLInputElement>('[data-audio-cutter-end]') as HTMLInputElement,
    preview: root.querySelector<HTMLAudioElement>('[data-audio-cutter-preview]') as HTMLAudioElement,
    downloadLink: root.querySelector<HTMLAnchorElement>('[data-audio-cutter-download]') as HTMLAnchorElement,
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
    !elements.playhead ||
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

  const state: AudioCutterState = {
    fileName: '',
    audioBuffer: null,
    duration: 0,
    outputSampleRate: 0,
    mode: 'keep',
    start: 0,
    end: 0,
    playhead: 0,
    peaks: [],
    sourceUrl: null,
    previewUrl: null,
    downloadUrl: null,
  }

  const dragState: { handle: AudioCutterHandle | null; pointerId: number | null } = {
    handle: null,
    pointerId: null,
  }
  let hasLoadError = false

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

  const revokeDownloadUrl = (): void => {
    if (!state.downloadUrl) {
      return
    }

    URL.revokeObjectURL(state.downloadUrl)
    state.downloadUrl = null
  }

  const buildSelectionBlob = (mode: AudioCutterMode): Blob | null => {
    const audioBuffer = state.audioBuffer
    if (!audioBuffer) {
      return null
    }

    const cutterChannelData = buildCutterChannelData(audioBuffer, state.start, state.end, mode)
    const wavChannelData =
      state.outputSampleRate > 0 && state.outputSampleRate !== audioBuffer.sampleRate
        ? cutterChannelData.map((channelData) => resampleChannelData(channelData, audioBuffer.sampleRate, state.outputSampleRate))
        : cutterChannelData

    return new Blob([encodeWav(wavChannelData, state.outputSampleRate || audioBuffer.sampleRate)], { type: 'audio/wav' })
  }

  const getPreviewDuration = (): number =>
    state.mode === 'keep'
      ? Math.max(0, state.end - state.start)
      : Math.max(0, state.duration - (state.end - state.start))

  const clampToPlayableSourceTime = (time: number): number => {
    const safeTime = clamp(time, 0, state.duration)

    if (state.mode === 'keep') {
      return clamp(safeTime, state.start, state.end)
    }

    if (safeTime <= state.start || safeTime >= state.end) {
      return safeTime
    }

    const distanceToStart = safeTime - state.start
    const distanceToEnd = state.end - safeTime
    return distanceToStart <= distanceToEnd ? state.start : state.end
  }

  const sourceTimeToPreviewTime = (time: number): number => {
    const safeTime = clampToPlayableSourceTime(time)

    if (state.mode === 'keep') {
      return clamp(safeTime - state.start, 0, getPreviewDuration())
    }

    const removedSpan = Math.max(0, state.end - state.start)
    return safeTime <= state.start ? clamp(safeTime, 0, state.start) : clamp(safeTime - removedSpan, state.start, getPreviewDuration())
  }

  const previewTimeToSourceTime = (time: number): number => {
    const previewDuration = getPreviewDuration()
    const safeTime = clamp(time, 0, previewDuration)

    if (state.mode === 'keep') {
      return clamp(state.start + safeTime, state.start, state.end)
    }

    const removedSpan = Math.max(0, state.end - state.start)
    return safeTime < state.start ? clamp(safeTime, 0, state.start) : clamp(safeTime + removedSpan, state.end, state.duration)
  }

  const syncSelectionPreview = (): void => {
    if (!state.audioBuffer) {
      revokePreviewUrl()
      elements.preview.removeAttribute('src')
      elements.preview.load()
      return
    }

    const wasPlaying = !elements.preview.paused && !elements.preview.ended
    const nextBlob = buildSelectionBlob(state.mode)
    if (!nextBlob) {
      return
    }

    state.playhead = clampToPlayableSourceTime(state.playhead)
    revokePreviewUrl()
    state.previewUrl = URL.createObjectURL(nextBlob)
    elements.preview.src = state.previewUrl
    elements.preview.load()

    elements.preview.currentTime = sourceTimeToPreviewTime(state.playhead)

    if (wasPlaying) {
      void elements.preview.play()
    }
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
    elements.summary.textContent = renderCutterSelectionLabel(messages, state.mode, state.start, state.end, state.duration)
  }

  const updateWaveformMarkers = (): void => {
    const duration = Math.max(state.duration, 0)
    const startRatio = duration === 0 ? 0 : clamp(state.start / duration, 0, 1)
    const endRatio = duration === 0 ? 1 : clamp(state.end / duration, 0, 1)
    const playheadRatio = duration === 0 ? 0 : clamp(state.playhead / duration, 0, 1)

    elements.selectionOverlay.style.left = `${startRatio * 100}%`
    elements.selectionOverlay.style.width = `${Math.max(0, (endRatio - startRatio) * 100)}%`
    elements.startHandle.style.left = `${startRatio * 100}%`
    elements.endHandle.style.left = `${endRatio * 100}%`
    elements.playhead.style.left = `${playheadRatio * 100}%`
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
      updateWaveformMarkers()
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
    updateWaveformMarkers()
  }

  const syncPlaybackEnd = (): void => {
    if (!state.audioBuffer || elements.preview.paused) {
      return
    }

    const previewDuration = getPreviewDuration()
    if (elements.preview.currentTime >= previewDuration) {
      elements.preview.pause()
      elements.preview.currentTime = previewDuration
      state.playhead = previewTimeToSourceTime(previewDuration)
      updateWaveformMarkers()
    }
  }

  const syncPlayheadFromPlayer = (): void => {
    if (!state.audioBuffer) {
      return
    }

    state.playhead = previewTimeToSourceTime(elements.preview.currentTime)
    updateWaveformMarkers()
    syncPlaybackEnd()
  }

  const syncDownloadPreview = (): void => {
    const audioBuffer = state.audioBuffer

    if (!audioBuffer) {
      revokeDownloadUrl()
      elements.downloadLink.removeAttribute('href')
      elements.downloadLink.removeAttribute('download')
      setDownloadState(false)
      return
    }

    revokeDownloadUrl()

    const downloadBlob = buildSelectionBlob(state.mode)
    if (!downloadBlob) {
      return
    }

    state.downloadUrl = URL.createObjectURL(downloadBlob)

    const downloadSuffix = state.mode === 'keep' ? 'trimmed' : 'removed'
    elements.downloadLink.href = state.downloadUrl
    elements.downloadLink.download = `${stripExtension(state.fileName || 'audio')}_${downloadSuffix}.wav`
    setDownloadState(true)

    const selectedDuration = state.mode === 'keep' ? Math.max(0, state.end - state.start) : Math.max(0, state.duration - (state.end - state.start))
    const isSilent = state.mode === 'remove' && selectedDuration === 0
    elements.status.textContent = isSilent ? messages.audioCutter.emptySelectionWarning : messages.audioCutter.statusReady
  }

  const syncStatusText = (): void => {
    if (!state.audioBuffer) {
      elements.status.textContent = hasLoadError ? messages.audioCutter.statusError : messages.audioCutter.statusNoFile
      return
    }

    const selectedDuration = state.mode === 'keep' ? Math.max(0, state.end - state.start) : Math.max(0, state.duration - (state.end - state.start))
    const isSilent = state.mode === 'remove' && selectedDuration === 0
    elements.status.textContent = isSilent ? messages.audioCutter.emptySelectionWarning : messages.audioCutter.statusReady
  }

  const setSelection = (start: number, end: number): void => {
    const normalized = normalizeSelection(start, end, state.duration)
    state.start = normalized.start
    state.end = normalized.end
    state.playhead = clampToPlayableSourceTime(state.playhead)
    syncTimeFields()
    updateTimeReadouts()
    syncSelectionPreview()
    drawCurrentWaveform()
    syncDownloadPreview()
    syncPlaybackEnd()
  }

  const setPlayhead = (time: number, syncAudio = false): void => {
    state.playhead = clampToPlayableSourceTime(time)
    updateWaveformMarkers()

    if (syncAudio) {
      elements.preview.currentTime = sourceTimeToPreviewTime(state.playhead)
    }

    syncPlaybackEnd()
  }

  const setSelectionForHandle = (handle: AudioCutterHandle, nextTime: number): void => {
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

  const beginDrag = (handle: AudioCutterHandle, pointerId: number): void => {
    dragState.handle = handle
    dragState.pointerId = pointerId
    document.body.style.userSelect = 'none'
    root.classList.add('audio-cutter-is-dragging')
  }

  const endDrag = (): void => {
    dragState.handle = null
    dragState.pointerId = null
    document.body.style.userSelect = ''
    root.classList.remove('audio-cutter-is-dragging')
  }

  const updateDragSelection = (clientX: number): void => {
    if (!dragState.handle) {
      return
    }

    if (dragState.handle === 'playhead') {
      setPlayhead(getTimeFromPointerX(clientX), true)
      return
    }

    setSelectionForHandle(dragState.handle, getTimeFromPointerX(clientX))
  }

  const setMode = (mode: AudioCutterMode): void => {
    state.mode = mode
    updateTimeReadouts()
    drawCurrentWaveform()
    syncSelectionPreview()
    syncDownloadPreview()
    syncPlaybackEnd()
  }

  const syncLocalizedText = (): void => {
    const uploadLabel = root.querySelector<HTMLElement>('.audio-cutter-panel-main .tool-field > span')
    const uploadHint = root.querySelectorAll<HTMLElement>('.audio-cutter-panel-main .tool-hint')[0]
    const waveformHeading = root.querySelector<HTMLElement>('.audio-cutter-waveform-header h2')
    const waveformHint = root.querySelectorAll<HTMLElement>('.audio-cutter-panel-main .tool-hint, .audio-cutter-waveform-block .tool-hint')[1]
    const modeLegend = root.querySelector<HTMLElement>('.audio-cutter-mode-fieldset legend')
    const modeLabels = root.querySelectorAll<HTMLElement>('.audio-cutter-mode-option span')
    const timeLabels = root.querySelectorAll<HTMLElement>('.audio-cutter-time-grid .tool-field > span')

    if (uploadLabel) uploadLabel.textContent = messages.audioCutter.uploadLabel
    if (uploadHint) uploadHint.textContent = `${messages.audioCutter.uploadHintLabel}: ${ACCEPTED_AUDIO_TYPES.replaceAll(',', ' / ')}`
    if (waveformHeading) waveformHeading.textContent = messages.audioCutter.waveformLabel
    if (waveformHint) waveformHint.textContent = messages.audioCutter.waveformHint
    if (modeLegend) modeLegend.textContent = messages.audioCutter.selectionModeLabel
    if (modeLabels[0]) modeLabels[0].textContent = messages.audioCutter.keepModeLabel
    if (modeLabels[1]) modeLabels[1].textContent = messages.audioCutter.removeModeLabel
    if (timeLabels[0]) timeLabels[0].textContent = messages.audioCutter.startLabel
    if (timeLabels[1]) timeLabels[1].textContent = messages.audioCutter.endLabel
    elements.browseButton.textContent = messages.audioCutter.browseAction
    elements.waveformCanvas.setAttribute('aria-label', messages.audioCutter.waveformLabel)
    elements.playhead.setAttribute('aria-label', messages.audioCutter.playheadLabel)
    elements.startHandle.setAttribute('aria-label', messages.audioCutter.startLabel)
    elements.endHandle.setAttribute('aria-label', messages.audioCutter.endLabel)
    elements.downloadLink.textContent = messages.audioCutter.downloadAction
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()

    if (state.audioBuffer) {
      syncTimeFields()
      updateTimeReadouts()
      drawCurrentWaveform()
      syncStatusText()
      syncSelectionPreview()
      return
    }

    elements.fileName.textContent = messages.audioCutter.noFileSelected
    revokePreviewUrl()
    revokeDownloadUrl()
    elements.preview.removeAttribute('src')
    elements.preview.load()
    elements.downloadLink.removeAttribute('href')
    elements.downloadLink.removeAttribute('download')
    setDownloadState(false)
    setControlsEnabled(false)

    if (hasLoadError) {
      elements.summary.textContent = messages.audioCutter.statusError
      elements.status.textContent = messages.audioCutter.statusError
    } else {
      elements.summary.textContent = messages.audioCutter.statusNoFile
      elements.status.textContent = messages.audioCutter.statusNoFile
    }

    drawCurrentWaveform()
  }

  audioCutterLocaleSyncers.set(root, syncLocale)

  const setControlsEnabled = (enabled: boolean): void => {
    elements.startInput.disabled = !enabled
    elements.endInput.disabled = !enabled
    elements.playhead.disabled = !enabled
    elements.modeInputs.forEach((input) => {
      input.disabled = !enabled
    })
  }

  const loadFile = async (file: File): Promise<void> => {
    elements.fileName.textContent = file.name
    elements.status.textContent = messages.audioCutter.statusLoading
    setDownloadState(false)
    setControlsEnabled(false)
    hasLoadError = false
    elements.preview.pause()

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
      state.playhead = 0
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
      syncSelectionPreview()
      syncDownloadPreview()
      syncPlaybackEnd()
    } catch {
      hasLoadError = true
      state.fileName = ''
      state.audioBuffer = null
      state.duration = 0
      state.outputSampleRate = 0
      state.peaks = []
      state.playhead = 0
      state.start = 0
      state.end = 0
      revokePreviewUrl()
      revokeDownloadUrl()
      elements.preview.removeAttribute('src')
      elements.preview.load()
      elements.downloadLink.removeAttribute('href')
      elements.downloadLink.removeAttribute('download')
      elements.fileName.textContent = messages.audioCutter.noFileSelected
      elements.summary.textContent = messages.audioCutter.statusError
      elements.status.textContent = messages.audioCutter.statusError
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

  elements.playhead.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    elements.playhead.setPointerCapture(event.pointerId)
    beginDrag('playhead', event.pointerId)
    setPlayhead(getTimeFromPointerX(event.clientX), true)
  })

  elements.waveformCanvas.addEventListener('pointerdown', (event) => {
    if (state.duration <= 0) {
      return
    }

    beginDrag('playhead', event.pointerId)
    setPlayhead(getTimeFromPointerX(event.clientX), true)
  })

  elements.preview.addEventListener('play', () => {
    if (!state.audioBuffer) {
      return
    }

    elements.preview.currentTime = sourceTimeToPreviewTime(state.playhead)
  })

  elements.preview.addEventListener('timeupdate', () => {
    syncPlayheadFromPlayer()
  })

  elements.preview.addEventListener('seeked', () => {
    syncPlayheadFromPlayer()
  })

  elements.preview.addEventListener('ended', () => {
    if (!state.audioBuffer) {
      return
    }

    state.playhead = previewTimeToSourceTime(getPreviewDuration())
    updateWaveformMarkers()
  })

  document.addEventListener('keydown', (event) => {
    if (!root.isConnected || isEditableTarget(event.target) || (event.key !== ' ' && event.code !== 'Space')) {
      return
    }

    event.preventDefault()

    if (!state.audioBuffer) {
      return
    }

    if (elements.preview.paused) {
      elements.preview.currentTime = sourceTimeToPreviewTime(state.playhead)
      void elements.preview.play()
      return
    }

    elements.preview.pause()
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
  elements.fileName.textContent = messages.audioCutter.noFileSelected
  elements.status.textContent = messages.audioCutter.statusNoFile
  elements.summary.textContent = messages.audioCutter.statusNoFile
  elements.preview.removeAttribute('src')
  elements.downloadLink.removeAttribute('href')
  elements.downloadLink.removeAttribute('download')
  setDownloadState(false)
  setControlsEnabled(false)
  drawCurrentWaveform()
}

export const updateAudioCutterLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-audio-cutter-root]')
  if (!root) {
    return
  }

  audioCutterLocaleSyncers.get(root)?.(messages)
}
