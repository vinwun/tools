import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { downloadBlob, formatAcceptList, stripExtension } from '../../foundations/files.ts'
import { formatMessage, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { clamp, localizeDecimalSeparator, parseDecimalNumber, resolveNumberLocale } from '../../foundations/numbers.ts'
import { createObjectUrlSlot } from '../../foundations/object-url.ts'
import { analyzeMp4, cutMp4, getKeyframeStartSeconds, getMaxDurationSeconds, getTrackDurationSeconds, pickVideoTrack } from '../mp4-utils.ts'
import { ACCEPTED_VIDEO_TYPES, bindSpacePlayback, describeVideoFailure, formatVideoSeconds, waitForPaint, type VideoFailure } from '../video-utils.ts'
import type { VideoCutterElements, VideoCutterState } from './types.ts'

const MIN_CUT_SECONDS = 0.1

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
    failure: null,
  }
  let loadToken = 0
  let selectionPlayback = false
  let endingPreviewTimeout: number | undefined

  const setStatus = (text: string): void => {
    elements.status.textContent = text
  }

  const failureMessage = (failure: VideoFailure): string =>
    failure === 'fragmented' ? messages.videoCutter.statusFragmented : describeVideoFailure(messages.videoCutter, failure)

  // The reason is kept, not the text, so the message follows a locale switch.
  const showFailure = (failure: VideoFailure): void => {
    state.failure = failure
    setStatus(failureMessage(failure))
  }

  const isEditable = (): boolean => state.source !== null && !state.isFragmented

  const syncSummary = (): void => {
    if (!isEditable()) {
      return
    }

    state.failure = null
    const { start, end } = state
    if (end - start < MIN_CUT_SECONDS) {
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
    state.failure = null

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
    }
    setInputValue(elements.startInput, state.start)
    setInputValue(elements.endInput, state.end)
    if (state.failure) {
      setStatus(failureMessage(state.failure))
    } else if (state.source === null) {
      setStatus(messages.videoCutter.statusNoFile)
    } else {
      syncSummary()
    }
  }

  const loadFile = async (file: File): Promise<void> => {
    resetState()
    const token = ++loadToken
    filePicker.setName(file.name)
    setStatus(messages.videoCutter.statusLoading)

    try {
      const source = new Uint8Array(await file.arrayBuffer())
      if (token !== loadToken) {
        return
      }
      const analysis = analyzeMp4(source)
      if (!analysis.moov) {
        showFailure('notMp4')
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
        showFailure('fragmented')
        setControlsEnabled(false)
        return
      }

      setInputValue(elements.startInput, 0)
      setInputValue(elements.endInput, state.duration)
      setControlsEnabled(true)
      syncSummary()
    } catch {
      if (token === loadToken) {
        showFailure('unsupported')
        setControlsEnabled(false)
      }
    }
  }

  const getPreviewDuration = (): number => {
    const val = Number(elements.previewDuration.value)
    return Number.isFinite(val) && val > 0 ? val : 1
  }

  const playEndingPreview = (): void => {
    if (!isEditable()) {
      return
    }
    elements.preview.currentTime = Math.max(0, state.end - getPreviewDuration())
    selectionPlayback = true
    void elements.preview.play()
  }

  // Stepping or typing the end changes it many times a second; only preview once it settles.
  const scheduleEndingPreview = (): void => {
    elements.preview.pause()
    window.clearTimeout(endingPreviewTimeout)
    endingPreviewTimeout = window.setTimeout(playEndingPreview, 300)
  }

  const handleCutDownload = async (): Promise<void> => {
    if (!state.source || state.isFragmented || state.isProcessing) {
      return
    }

    if (state.end - state.start < MIN_CUT_SECONDS) {
      setStatus(messages.videoCutter.statusInvalidRange)
      return
    }

    state.isProcessing = true
    setControlsEnabled(false)
    setStatus(messages.videoCutter.statusProcessing)

    try {
      await waitForPaint()
      const result = cutMp4(state.source, { startSeconds: state.start, endSeconds: state.end })
      if (!result.ok) {
        showFailure(result.reason)
        return
      }

      downloadBlob(new Blob([result.bytes], { type: 'video/mp4' }), `${stripExtension(state.fileName)}_cut.mp4`)
      syncSummary()
    } catch (error) {
      console.error(error)
      showFailure('error')
    } finally {
      state.isProcessing = false
      setControlsEnabled(true)
    }
  }

  const stepValue = (value: number, delta: number, min: number, max: number): number =>
    clamp(Math.round((value + delta) * 100) / 100, min, max)

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

  const getKeyframeStart = (): number =>
    state.analysis ? getKeyframeStartSeconds(state.analysis, state.start) : state.start

  const setStart = (value: number): void => {
    state.start = clamp(value, 0, state.end)
    elements.preview.currentTime = getKeyframeStart()
    syncSummary()
  }

  const setEnd = (value: number): void => {
    state.end = clamp(value, state.start, state.duration)
    scheduleEndingPreview()
    syncSummary()
  }

  const stepStart = (delta: number): void => {
    if (!isEditable()) return
    setStart(stepValue(state.start, delta, 0, state.end))
    setInputValue(elements.startInput, state.start)
  }

  const stepEnd = (delta: number): void => {
    if (!isEditable()) return
    setEnd(stepValue(state.end, delta, state.start, state.duration))
    setInputValue(elements.endInput, state.end)
  }

  attachStepButton(elements.startStepDown, () => stepStart(-0.1))
  attachStepButton(elements.startStepUp, () => stepStart(0.1))
  attachStepButton(elements.endStepDown, () => stepEnd(-0.1))
  attachStepButton(elements.endStepUp, () => stepEnd(0.1))

  // Typing only updates the state; rewriting the field mid-typing would turn "1" + "0" into "1,000".
  elements.startInput.addEventListener('input', () => {
    const value = parseDecimalNumber(elements.startInput.value)
    if (value !== null && isEditable()) setStart(value)
  })
  elements.endInput.addEventListener('input', () => {
    const value = parseDecimalNumber(elements.endInput.value)
    if (value !== null && isEditable()) setEnd(value)
  })
  elements.startInput.addEventListener('change', () => setInputValue(elements.startInput, state.start))
  elements.endInput.addEventListener('change', () => setInputValue(elements.endInput, state.end))

  elements.cutDownload.addEventListener('click', () => {
    void handleCutDownload()
  })

  // Only the selection playback stops at the end; scrubbing in the player itself stays free.
  elements.preview.addEventListener('timeupdate', () => {
    if (selectionPlayback && elements.preview.currentTime >= state.end) {
      elements.preview.pause()
    }
  })
  elements.preview.addEventListener('pause', () => {
    selectionPlayback = false
  })

  elements.playSelection.addEventListener('click', () => {
    if (!isEditable()) {
      return
    }
    elements.preview.currentTime = getKeyframeStart()
    selectionPlayback = true
    void elements.preview.play()
  })

  elements.playEnding.addEventListener('click', () => {
    playEndingPreview()
  })

  // A value that would fall back to 1 s shows that 1 s instead of staying "0" or empty.
  elements.previewDuration.addEventListener('blur', () => {
    elements.previewDuration.value = String(getPreviewDuration())
  })

  const unbindSpacePlayback = bindSpacePlayback(elements.preview)

  syncLocale(messages)
  setControlsEnabled(false)

  return {
    updateLocale: syncLocale,
    destroy: () => {
      unbindSpacePlayback()
      stopStepRepeats.forEach((stop) => stop())
      window.clearTimeout(endingPreviewTimeout)
      elements.preview.pause()
      previewUrl.clear()
    },
  }
}
