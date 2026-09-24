import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { downloadBlob, formatAcceptList, stripExtension } from '../../foundations/files.ts'
import { formatMessage, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { clamp, localizeDecimalSeparator, parseDecimalNumber, resolveNumberLocale } from '../../foundations/numbers.ts'
import { createObjectUrlSlot } from '../../foundations/object-url.ts'
import { analyzeMp4, cutMp4, getKeyframeStartSeconds, getMaxDurationSeconds, getTrackDurationSeconds, pickVideoTrack } from '../mp4-utils.ts'
import { ACCEPTED_VIDEO_TYPES, formatVideoSeconds } from '../video-utils.ts'
import type { VideoCutterElements, VideoCutterState } from './types.ts'

const setInputValue = (input: HTMLInputElement, value: number): void => {
  input.value = localizeDecimalSeparator(value.toFixed(2), resolveNumberLocale())
}

export const mountVideoCutter: MountTool = (container, initialMessages) => {
  let messages = initialMessages
  const elements = queryRequired<VideoCutterElements>(container, {
    status: '[data-video-cutter-status]',
    preview: '[data-video-cutter-preview]',
    startInput: '[data-video-cutter-start]',
    startStepDown: '[data-video-cutter-start-down]',
    startStepUp: '[data-video-cutter-start-up]',
    endInput: '[data-video-cutter-end]',
    endStepDown: '[data-video-cutter-end-down]',
    endStepUp: '[data-video-cutter-end-up]',
    playSelection: '[data-video-cutter-play-selection]',
    playEnding: '[data-video-cutter-play-ending]',
    previewDuration: '[data-video-cutter-preview-duration]',
    actualStartLabel: '[data-video-cutter-actual-start]',
    cutDownload: '[data-video-cutter-download]',
    uploadLabel: '[data-video-cutter-upload-label]',
    uploadHint: '[data-video-cutter-upload-hint]',
    previewHeading: '[data-video-cutter-preview-heading]',
    startLabel: '[data-video-cutter-start-label]',
    endLabel: '[data-video-cutter-end-label]',
    previewDurationLabel: '[data-video-cutter-preview-duration-label]',
  })
  const filePicker = elements ? wireFilePicker(container, { onFiles: (files) => void loadFile(files[0]) }) : null
  if (!elements || !filePicker) {
    return {}
  }

  const state: VideoCutterState = {
    fileName: '',
    source: null,
    analysis: null,
    duration: 0,
    isFragmented: false,
    isProcessing: false,
    start: 0,
    end: 0,
  }

  const setStatus = (text: string): void => {
    elements.status.textContent = text
  }

  const syncSummary = (): void => {
    if (state.source === null || state.isFragmented) {
      return
    }

    let start = parseDecimalNumber(elements.startInput.value) ?? 0
    let end = parseDecimalNumber(elements.endInput.value) ?? state.duration
    if (start < 0) start = 0
    if (end > state.duration) end = state.duration
    if (end < start) end = start

    if (end - start < 0.001) {
      setStatus(messages.videoCutter.statusInvalidRange)
      elements.actualStartLabel.textContent = ''
      return
    }

    let displayStart = start
    if (state.analysis) {
      const effectiveStart = getKeyframeStartSeconds(state.analysis, start)
      if (effectiveStart + 0.001 < start) {
        displayStart = effectiveStart
        elements.actualStartLabel.textContent = `${messages.videoCutter.actualStartLabel} ${formatVideoSeconds(effectiveStart)}`
      } else {
        elements.actualStartLabel.textContent = ''
      }
    }

    setStatus(
      formatMessage(messages.videoCutter.selectedSummary, {
        start: formatVideoSeconds(displayStart),
        end: formatVideoSeconds(end),
        length: formatVideoSeconds(end - displayStart),
      }),
    )
  }

  const setControlsEnabled = (enabled: boolean): void => {
    elements.startInput.disabled = !enabled
    elements.startStepDown.disabled = !enabled
    elements.startStepUp.disabled = !enabled
    elements.endInput.disabled = !enabled
    elements.endStepDown.disabled = !enabled
    elements.endStepUp.disabled = !enabled
    elements.playSelection.disabled = !enabled
    elements.playEnding.disabled = !enabled
    elements.previewDuration.disabled = !enabled
    elements.cutDownload.disabled = !enabled
  }

  const previewUrl = createObjectUrlSlot()

  const resetState = (): void => {
    state.fileName = ''
    state.source = null
    state.analysis = null
    state.duration = 0
    state.isFragmented = false
    state.isProcessing = false
    state.start = 0
    state.end = 0

    previewUrl.clear()
    elements.preview.removeAttribute('src')
    elements.preview.load()
    setInputValue(elements.startInput, 0)
    setInputValue(elements.endInput, 0)
    setStatus(messages.videoCutter.statusNoFile)
    setControlsEnabled(false)
  }

  const syncLocalizedText = (): void => {
    elements.uploadLabel.textContent = messages.videoCutter.uploadLabel
    elements.uploadHint.textContent = `${messages.videoCutter.uploadHintLabel}: ${formatAcceptList(ACCEPTED_VIDEO_TYPES)}`
    elements.previewHeading.textContent = messages.videoCutter.previewLabel
    elements.startLabel.textContent = messages.videoCutter.startLabel
    elements.endLabel.textContent = messages.videoCutter.endLabel
    elements.previewDurationLabel.textContent = messages.videoCutter.previewDurationLabel
    elements.playSelection.textContent = messages.videoCutter.playSelectionAction
    elements.playEnding.textContent = messages.videoCutter.playEndingAction
    elements.cutDownload.textContent = messages.videoCutter.downloadAction
    elements.actualStartLabel.textContent = ''
    filePicker.browseButton.textContent = messages.videoCutter.browseAction
    elements.startStepDown.setAttribute('aria-label', messages.videoCutter.stepDownAction)
    elements.endStepDown.setAttribute('aria-label', messages.videoCutter.stepDownAction)
    elements.startStepUp.setAttribute('aria-label', messages.videoCutter.stepUpAction)
    elements.endStepUp.setAttribute('aria-label', messages.videoCutter.stepUpAction)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()

    if (state.source === null) {
      filePicker.setName(messages.videoCutter.noFileSelected)
      setInputValue(elements.startInput, 0)
      setInputValue(elements.endInput, 0)
      setStatus(messages.videoCutter.statusNoFile)
      return
    }

    if (state.isFragmented) {
      setInputValue(elements.startInput, state.start)
      setInputValue(elements.endInput, state.end)
      setStatus(messages.videoCutter.statusFragmented)
      return
    }

    const currentStart = parseDecimalNumber(elements.startInput.value) ?? state.start
    const currentEnd = parseDecimalNumber(elements.endInput.value) ?? state.end
    state.start = currentStart
    state.end = currentEnd
    setInputValue(elements.startInput, currentStart)
    setInputValue(elements.endInput, currentEnd)
    syncSummary()
  }

  const loadFile = async (file: File): Promise<void> => {
    resetState()
    filePicker.setName(file.name)
    setStatus(messages.videoCutter.statusLoading)

    try {
      const source = new Uint8Array(await file.arrayBuffer())
      const analysis = analyzeMp4(source)
      if (!analysis.moov) {
        setStatus(messages.videoCutter.statusUnsupported)
        return
      }

      const videoTrack = pickVideoTrack(analysis)
      state.fileName = file.name
      state.source = source
      state.analysis = analysis
      state.duration = videoTrack ? getTrackDurationSeconds(videoTrack) : getMaxDurationSeconds(analysis)
      state.isFragmented = analysis.fragmented
      state.start = 0
      state.end = state.duration

      elements.preview.src = previewUrl.set(file)
      elements.preview.load()

      if (state.isFragmented) {
        setStatus(messages.videoCutter.statusFragmented)
        setControlsEnabled(false)
        return
      }

      setInputValue(elements.startInput, 0)
      setInputValue(elements.endInput, state.duration)
      setControlsEnabled(true)
      syncSummary()
    } catch {
      setStatus(messages.videoCutter.statusUnsupported)
      setControlsEnabled(false)
    }
  }

  const getRange = (): { startSeconds: number; endSeconds: number; valid: boolean } => {
    const startSeconds = parseDecimalNumber(elements.startInput.value) ?? 0
    const endSeconds = parseDecimalNumber(elements.endInput.value) ?? state.duration
    const start = clamp(startSeconds, 0, state.duration)
    const end = clamp(endSeconds, 0, state.duration)
    return { startSeconds: start, endSeconds: end, valid: end - start >= 0.1 }
  }

  const getPreviewDuration = (): number => {
    const val = Number(elements.previewDuration.value)
    return Number.isFinite(val) && val > 0 ? val : 1
  }

  const playEndingPreview = (): void => {
    if (state.source === null || state.isFragmented) {
      return
    }
    const end = parseDecimalNumber(elements.endInput.value)
    if (end === null) {
      return
    }
    const previewDur = getPreviewDuration()
    const seekTo = Math.max(0, end - previewDur)
    elements.preview.currentTime = seekTo
    void elements.preview.play()
  }

  const handleCutDownload = async (): Promise<void> => {
    if (!state.source || state.isFragmented || state.isProcessing) {
      return
    }

    const range = getRange()
    if (!range.valid) {
      setStatus(messages.videoCutter.statusInvalidRange)
      return
    }

    state.isProcessing = true
    setControlsEnabled(false)
    setStatus(messages.videoCutter.statusProcessing)

    try {
      const result = cutMp4(state.source, { startSeconds: range.startSeconds, endSeconds: range.endSeconds })
      if (!result.ok) {
        setStatus(result.reason === 'fragmented' ? messages.videoCutter.statusFragmented : messages.videoCutter.statusError)
        return
      }

      downloadBlob(new Blob([result.bytes], { type: 'video/mp4' }), `${stripExtension(state.fileName)}_cut.mp4`)
      syncSummary()
    } finally {
      state.isProcessing = false
      setControlsEnabled(true)
    }
  }

  const stepInput = (input: HTMLInputElement, delta: number, min: number, max: number): void => {
    const current = parseDecimalNumber(input.value) ?? min
    const stepped = Math.round((current + delta) * 100) / 100
    const clamped = clamp(stepped, min, max)
    setInputValue(input, clamped)
  }

  const stopStepRepeats: Array<() => void> = []

  const attachStepButton = (
    btn: HTMLButtonElement,
    action: () => void,
  ): void => {
    let interval: ReturnType<typeof setInterval> | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    const stop = (): void => {
      if (timeout !== null) { clearTimeout(timeout); timeout = null }
      if (interval !== null) { clearInterval(interval); interval = null }
    }
    stopStepRepeats.push(stop)

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      action()
      timeout = setTimeout(() => {
        interval = setInterval(action, 80)
      }, 400)
    })

    btn.addEventListener('pointerup', stop)
    btn.addEventListener('pointerleave', stop)
    // Touch sends pointercancel, not pointerup, when the finger drifts.
    btn.addEventListener('pointercancel', stop)
    btn.addEventListener('click', (e) => e.preventDefault())
  }

  const seekToStart = (): void => {
    if (state.source === null || state.isFragmented) return
    const newStart = parseDecimalNumber(elements.startInput.value) ?? 0
    let seekTo = newStart
    if (state.analysis) {
      seekTo = getKeyframeStartSeconds(state.analysis, newStart)
    }
    elements.preview.currentTime = seekTo
  }

  attachStepButton(elements.startStepDown, () => {
    if (state.source === null || state.isFragmented) return
    const endVal = parseDecimalNumber(elements.endInput.value) ?? state.duration
    stepInput(elements.startInput, -0.1, 0, endVal)
    seekToStart()
    syncSummary()
  })

  attachStepButton(elements.startStepUp, () => {
    if (state.source === null || state.isFragmented) return
    const endVal = parseDecimalNumber(elements.endInput.value) ?? state.duration
    stepInput(elements.startInput, 0.1, 0, endVal)
    seekToStart()
    syncSummary()
  })

  attachStepButton(elements.endStepDown, () => {
    if (state.source === null || state.isFragmented) return
    const startVal = parseDecimalNumber(elements.startInput.value) ?? 0
    stepInput(elements.endInput, -0.1, startVal, state.duration)
    playEndingPreview()
    syncSummary()
  })

  attachStepButton(elements.endStepUp, () => {
    if (state.source === null || state.isFragmented) return
    const startVal = parseDecimalNumber(elements.startInput.value) ?? 0
    stepInput(elements.endInput, 0.1, startVal, state.duration)
    playEndingPreview()
    syncSummary()
  })

  elements.startInput.addEventListener('input', () => {
    const val = parseDecimalNumber(elements.startInput.value)
    if (val !== null) {
      const clamped = clamp(val, 0, state.duration)
      setInputValue(elements.startInput, clamped)
      if (state.source !== null && !state.isFragmented) {
        let seekTo = clamped
        if (state.analysis) {
          seekTo = getKeyframeStartSeconds(state.analysis, clamped)
        }
        elements.preview.currentTime = seekTo
      }
    }
    syncSummary()
  })

  elements.endInput.addEventListener('input', () => {
    const val = parseDecimalNumber(elements.endInput.value)
    if (val !== null) {
      const clamped = clamp(val, 0, state.duration)
      setInputValue(elements.endInput, clamped)
      if (state.source !== null && !state.isFragmented) {
        if (!elements.preview.paused && elements.preview.currentTime > clamped) {
          elements.preview.pause()
        }
        playEndingPreview()
      }
    }
    syncSummary()
  })

  elements.startInput.addEventListener('blur', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    const parsed = parseDecimalNumber(elements.startInput.value)
    if (parsed === null) {
      setInputValue(elements.startInput, state.start)
      return
    }
    const clamped = clamp(parsed, 0, state.end)
    state.start = clamped
    setInputValue(elements.startInput, clamped)
    syncSummary()
  })

  elements.endInput.addEventListener('blur', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    const parsed = parseDecimalNumber(elements.endInput.value)
    if (parsed === null) {
      setInputValue(elements.endInput, state.end)
      return
    }
    const clamped = clamp(parsed, state.start, state.duration)
    state.end = clamped
    setInputValue(elements.endInput, clamped)
    syncSummary()
  })

  elements.cutDownload.addEventListener('click', () => {
    void handleCutDownload()
  })

  elements.preview.addEventListener('timeupdate', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    const end = parseDecimalNumber(elements.endInput.value)
    if (end !== null && elements.preview.currentTime >= end) {
      elements.preview.pause()
    }
  })

  elements.preview.addEventListener('ended', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    let start = parseDecimalNumber(elements.startInput.value)
    if (start === null) {
      return
    }
    if (state.analysis) {
      start = getKeyframeStartSeconds(state.analysis, start)
    }
    elements.preview.currentTime = start
  })

  elements.preview.addEventListener('seeked', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    let start = parseDecimalNumber(elements.startInput.value) ?? 0
    if (state.analysis) {
      start = getKeyframeStartSeconds(state.analysis, start)
    }
    const end = parseDecimalNumber(elements.endInput.value) ?? state.duration
    if (elements.preview.currentTime < start) {
      elements.preview.currentTime = start
    }
    if (elements.preview.currentTime > end) {
      elements.preview.currentTime = end
    }
  })

  elements.playSelection.addEventListener('click', () => {
    if (state.source === null || state.isFragmented) {
      return
    }
    const range = getRange()
    let playStart = range.startSeconds
    if (state.analysis) {
      playStart = getKeyframeStartSeconds(state.analysis, playStart)
    }
    elements.preview.currentTime = playStart
    void elements.preview.play()
  })

  elements.playEnding.addEventListener('click', () => {
    playEndingPreview()
  })

  syncLocale(messages)
  setControlsEnabled(false)

  return {
    updateLocale: syncLocale,
    destroy: () => {
      stopStepRepeats.forEach((stop) => stop())
      elements.preview.pause()
      previewUrl.clear()
    },
  }
}
