import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { setCanvasSize } from '../../foundations/canvas.ts'
import { queryRequired } from '../../foundations/dom.ts'
import { formatAcceptList, stripExtension } from '../../foundations/files.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { clamp } from '../../foundations/numbers.ts'
import { createObjectUrlSlot } from '../../foundations/object-url.ts'
import { ACCEPTED_AUDIO_TYPES, decodeAudioFile, encodeWav, readAudioSampleRate, resampleChannelData } from '../audio-utils.ts'
import type { AudioCutterElements, AudioCutterHandle, AudioCutterMode, AudioCutterState } from './types.ts'
import {
  buildCutterChannelData,
  computePeaks,
  drawWaveform,
  formatTime,
  getWaveformBarCount,
  normalizeSelection,
  MIN_SELECTION_SECONDS,
  parseTimeInput,
  renderCutterSelectionLabel,
} from './utils.ts'

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)

export const mountAudioCutter: MountTool = (container, initialMessages) => {
  let messages = initialMessages
  const root = container.querySelector<HTMLElement>('[data-audio-cutter-root]')
  if (!root) {
    return {}
  }

  const filePicker = wireFilePicker(root, { onFiles: (files) => void loadFile(files[0]) })
  const requiredElements = queryRequired<Omit<AudioCutterElements, 'modeInputs'>>(root, {
    status: '[data-audio-cutter-status]',
    summary: '[data-audio-cutter-summary]',
    uploadHint: '[data-audio-cutter-upload-hint]',
    waveformCanvas: '[data-audio-cutter-waveform]',
    selectionOverlay: '[data-audio-cutter-selection]',
    playhead: '[data-audio-cutter-playhead]',
    startHandle: '[data-audio-cutter-start-handle]',
    endHandle: '[data-audio-cutter-end-handle]',
    startInput: '[data-audio-cutter-start]',
    endInput: '[data-audio-cutter-end]',
    preview: '[data-audio-cutter-preview]',
    downloadLink: '[data-audio-cutter-download]',
  })
  const modeInputs = Array.from(root.querySelectorAll<HTMLInputElement>('[data-audio-cutter-mode]'))
  if (!filePicker || !requiredElements || modeInputs.length === 0) {
    return {}
  }

  const elements: AudioCutterElements = { ...requiredElements, modeInputs }
  // Also detaches the document/window listeners, which would otherwise keep the decoded audio alive.
  const listeners = new AbortController()
  const { signal } = listeners

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
  }

  const dragState: { handle: AudioCutterHandle | null; pointerId: number | null } = {
    handle: null,
    pointerId: null,
  }
  let hasLoadError = false

  const setDownloadState = (enabled: boolean): void => {
    elements.downloadLink.classList.toggle('is-disabled', !enabled)
    elements.downloadLink.setAttribute('aria-disabled', enabled ? 'false' : 'true')
    // An anchor without href is inert, so the disabled link cannot be clicked through.
    if (!enabled) {
      elements.downloadLink.removeAttribute('href')
      elements.downloadLink.removeAttribute('download')
    }
  }

  const previewUrl = createObjectUrlSlot()
  const downloadUrl = createObjectUrlSlot()

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
      previewUrl.clear()
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
    elements.preview.src = previewUrl.set(nextBlob)
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
      downloadUrl.clear()
      setDownloadState(false)
      return
    }

    downloadUrl.clear()

    const downloadBlob = buildSelectionBlob(state.mode)
    if (!downloadBlob) {
      return
    }

    const downloadSuffix = state.mode === 'keep' ? 'trimmed' : 'removed'
    elements.downloadLink.href = downloadUrl.set(downloadBlob)
    elements.downloadLink.download = `${stripExtension(state.fileName || 'audio')}_${downloadSuffix}.wav`
    setDownloadState(true)
    syncStatusText()
  }

  const syncStatusText = (): void => {
    if (!state.audioBuffer) {
      elements.status.textContent = hasLoadError ? messages.audioCutter.statusError : messages.audioCutter.statusNoFile
      return
    }

    const isSilent = state.mode === 'remove' && getPreviewDuration() === 0
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
    root.querySelectorAll<HTMLElement>('[data-audio-cutter-text]').forEach((element) => {
      const key = element.dataset.audioCutterText as keyof Messages['audioCutter']
      element.textContent = messages.audioCutter[key]
    })
    elements.uploadHint.textContent = `${messages.audioCutter.uploadHintLabel}: ${formatAcceptList(ACCEPTED_AUDIO_TYPES)}`
    elements.waveformCanvas.setAttribute('aria-label', messages.audioCutter.waveformLabel)
    elements.playhead.setAttribute('aria-label', messages.audioCutter.playheadLabel)
    elements.startHandle.setAttribute('aria-label', messages.audioCutter.startLabel)
    elements.endHandle.setAttribute('aria-label', messages.audioCutter.endLabel)
    elements.downloadLink.textContent = messages.audioCutter.downloadAction
  }

  const showEmptyState = (): void => {
    previewUrl.clear()
    downloadUrl.clear()
    elements.preview.removeAttribute('src')
    elements.preview.load()
    setDownloadState(false)
    setControlsEnabled(false)
    filePicker.setName(messages.audioCutter.noFileSelected)
    const statusText = hasLoadError ? messages.audioCutter.statusError : messages.audioCutter.statusNoFile
    elements.summary.textContent = statusText
    elements.status.textContent = statusText
    drawCurrentWaveform()
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

    showEmptyState()
  }

  const setControlsEnabled = (enabled: boolean): void => {
    elements.startInput.disabled = !enabled
    elements.endInput.disabled = !enabled
    elements.playhead.disabled = !enabled
    elements.modeInputs.forEach((input) => {
      input.disabled = !enabled
    })
  }

  const loadFile = async (file: File): Promise<void> => {
    filePicker.setName(file.name)
    elements.status.textContent = messages.audioCutter.statusLoading
    setDownloadState(false)
    setControlsEnabled(false)
    hasLoadError = false
    elements.preview.pause()

    try {
      const targetSampleRate = await readAudioSampleRate(file)
      const audioBuffer = await decodeAudioFile(file, targetSampleRate ?? undefined)
      if (signal.aborted) {
        return
      }

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
      showEmptyState()
    }
  }

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
    if (isEditableTarget(event.target) || (event.key !== ' ' && event.code !== 'Space')) {
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
  }, { signal })

  window.addEventListener('pointermove', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    updateDragSelection(event.clientX)
  }, { signal })

  window.addEventListener('pointerup', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    endDrag()
  }, { signal })

  window.addEventListener('pointercancel', (event) => {
    if (dragState.pointerId !== event.pointerId) {
      return
    }

    endDrag()
  }, { signal })

  window.addEventListener('resize', drawCurrentWaveform, { signal })

  syncTimeFields()
  showEmptyState()

  return {
    updateLocale: syncLocale,
    destroy: () => {
      listeners.abort()
      endDrag()
      elements.preview.pause()
      previewUrl.clear()
      downloadUrl.clear()
    },
  }
}
