import { messagesByLocale, type Locale } from '../../../i18n'
import type { Messages } from '../../../i18n/schema.ts'
import { stripExtension } from '../../foundations/file-converter/utils'
import { decodeAudioFile, encodeWav, readAudioSampleRate } from '../../audio/audio-utils.ts'
import { analyzeMp4, getMaxDurationSeconds, stripAudioTracks } from '../mp4-utils.ts'
import { ACCEPTED_VIDEO_TYPES, downloadBlob, formatVideoSeconds } from '../video-utils.ts'
import { formatMessage } from '../../image/color-picker/utils.ts'
import type { VideoAudioSplitterElements, VideoAudioSplitterState } from './types.ts'

const videoAudioSplitterLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages, locale: Locale) => void>()

export const mountVideoAudioSplitter = (container: HTMLElement, locale: Locale): void => {
  let messages = messagesByLocale[locale]
  const root = container.querySelector<HTMLElement>('[data-video-audio-splitter-root]')
  if (!root) {
    return
  }

  const elements: VideoAudioSplitterElements = {
    fileInput: root.querySelector<HTMLInputElement>('[data-video-audio-splitter-file]') as HTMLInputElement,
    browseButton: root.querySelector<HTMLButtonElement>('[data-video-audio-splitter-browse]') as HTMLButtonElement,
    dropzone: root.querySelector<HTMLElement>('[data-video-audio-splitter-dropzone]') as HTMLElement,
    fileName: root.querySelector<HTMLElement>('[data-video-audio-splitter-file-name]') as HTMLElement,
    status: root.querySelector<HTMLElement>('[data-video-audio-splitter-status]') as HTMLElement,
    preview: root.querySelector<HTMLVideoElement>('[data-video-audio-splitter-preview]') as HTMLVideoElement,
    durationValue: root.querySelector<HTMLElement>('[data-video-audio-splitter-duration]') as HTMLElement,
    formatValue: root.querySelector<HTMLElement>('[data-video-audio-splitter-format]') as HTMLElement,
    tracksValue: root.querySelector<HTMLElement>('[data-video-audio-splitter-tracks]') as HTMLElement,
    audioDownload: root.querySelector<HTMLButtonElement>('[data-video-audio-splitter-audio-download]') as HTMLButtonElement,
    silentDownload: root.querySelector<HTMLButtonElement>('[data-video-audio-splitter-silent-download]') as HTMLButtonElement,
  }

  if (
    !elements.fileInput ||
    !elements.browseButton ||
    !elements.dropzone ||
    !elements.fileName ||
    !elements.status ||
    !elements.preview ||
    !elements.durationValue ||
    !elements.formatValue ||
    !elements.tracksValue ||
    !elements.audioDownload ||
    !elements.silentDownload
  ) {
    return
  }

  const state: VideoAudioSplitterState = {
    fileName: '',
    file: null,
    source: null,
    previewUrl: null,
    duration: 0,
    fragmented: false,
    trackCount: 0,
    videoTrackCount: 0,
    audioTrackCount: 0,
    isProcessing: false,
    errorReason: null,
    locale,
  }

  const setStatus = (text: string): void => {
    elements.status.textContent = text
  }

  const revokePreviewUrl = (): void => {
    if (!state.previewUrl) {
      return
    }

    URL.revokeObjectURL(state.previewUrl)
    state.previewUrl = null
  }

  const hasAudioTrack = (): boolean => state.file !== null && state.audioTrackCount > 0

  const setProcessing = (active: boolean): void => {
    state.isProcessing = active
    const canDownload = !active && hasAudioTrack()
    elements.audioDownload.disabled = !canDownload
    elements.silentDownload.disabled = !canDownload
  }

  const renderInfo = (): void => {
    elements.durationValue.textContent = formatVideoSeconds(state.duration, state.locale)
    elements.formatValue.textContent = state.fragmented
      ? messages.videoAudioSplitter.formatFragmented
      : messages.videoAudioSplitter.formatStandard
    elements.tracksValue.textContent = formatMessage(messages.videoAudioSplitter.tracksValue, {
      total: String(state.trackCount),
      video: String(state.videoTrackCount),
      audio: String(state.audioTrackCount),
    })
    setStatus(hasAudioTrack() ? messages.videoAudioSplitter.statusReady : messages.videoAudioSplitter.alreadySilent)
  }

  const resetState = (): void => {
    state.fileName = ''
    state.file = null
    state.source = null
    state.duration = 0
    state.fragmented = false
    state.trackCount = 0
    state.videoTrackCount = 0
    state.audioTrackCount = 0
    state.isProcessing = false
    state.errorReason = null

    revokePreviewUrl()
    elements.preview.removeAttribute('src')
    elements.preview.load()
    elements.durationValue.textContent = '—'
    elements.formatValue.textContent = '—'
    elements.tracksValue.textContent = '—'
    setStatus(messages.videoAudioSplitter.statusNoFile)
    setProcessing(false)
  }

  const buildWavBuffer = async (file: File): Promise<ArrayBuffer> => {
    const sourceSampleRate = (await readAudioSampleRate(file)) ?? undefined
    const decodedAudio = await decodeAudioFile(file, sourceSampleRate)
    return encodeWav(
      Array.from({ length: decodedAudio.numberOfChannels }, (_, channelIndex) =>
        decodedAudio.getChannelData(channelIndex),
      ),
      decodedAudio.sampleRate,
    )
  }

  const handleAudioDownload = async (): Promise<void> => {
    if (!hasAudioTrack() || state.isProcessing) {
      return
    }

    setProcessing(true)
    setStatus(messages.videoAudioSplitter.statusProcessing)

    try {
      const wavBuffer = await buildWavBuffer(state.file as File)
      downloadBlob(new Blob([wavBuffer], { type: 'audio/wav' }), `${stripExtension(state.fileName)}.wav`)
      setStatus(messages.videoAudioSplitter.statusReady)
    } catch {
      state.errorReason = 'audio'
      setStatus(messages.videoAudioSplitter.statusError)
    } finally {
      setProcessing(false)
    }
  }

  const handleSilentDownload = async (): Promise<void> => {
    if (!hasAudioTrack() || state.isProcessing || !state.source) {
      return
    }

    setProcessing(true)
    setStatus(messages.videoAudioSplitter.statusProcessing)

    try {
      const result = stripAudioTracks(state.source)
      if (!result.ok) {
        state.errorReason = result.reason
        setStatus(messages.videoAudioSplitter.statusError)
        return
      }

      downloadBlob(new Blob([result.bytes], { type: 'video/mp4' }), `${stripExtension(state.fileName)}_silent.mp4`)
      setStatus(messages.videoAudioSplitter.statusReady)
    } finally {
      setProcessing(false)
    }
  }

  const syncLocalizedText = (): void => {
    const uploadLabels = root.querySelectorAll<HTMLElement>('.video-audio-splitter-panel-main > .tool-field > span')
    const uploadHint = root.querySelectorAll<HTMLElement>('.video-audio-splitter-panel-main > .tool-hint')[0]
    const previewHeading = root.querySelector<HTMLElement>('.video-audio-splitter-preview-block h2')
    const infoHeading = root.querySelector<HTMLElement>('.video-audio-splitter-info h2')
    const infoLabels = root.querySelectorAll<HTMLElement>('.video-audio-splitter-info-row dt')

    if (uploadLabels[0]) uploadLabels[0].textContent = messages.videoAudioSplitter.uploadLabel
    if (uploadHint) uploadHint.textContent = `${messages.videoAudioSplitter.uploadHintLabel}: ${ACCEPTED_VIDEO_TYPES.replaceAll(',', ' / ')}`
    if (previewHeading) previewHeading.textContent = messages.videoAudioSplitter.previewLabel
    if (infoHeading) infoHeading.textContent = messages.videoAudioSplitter.infoTitle
    if (infoLabels[0]) infoLabels[0].textContent = messages.videoAudioSplitter.durationLabel
    if (infoLabels[1]) infoLabels[1].textContent = messages.videoAudioSplitter.formatLabel
    if (infoLabels[2]) infoLabels[2].textContent = messages.videoAudioSplitter.tracksLabel
    elements.browseButton.textContent = messages.videoAudioSplitter.browseAction
    elements.audioDownload.textContent = messages.videoAudioSplitter.audioDownloadAction
    elements.silentDownload.textContent = messages.videoAudioSplitter.silentDownloadAction
  }

  const syncLocale = (nextMessages: Messages, nextLocale: Locale): void => {
    messages = nextMessages
    state.locale = nextLocale
    syncLocalizedText()

    if (!state.file) {
      elements.fileName.textContent = messages.videoAudioSplitter.noFileSelected
      setStatus(state.errorReason ? messages.videoAudioSplitter.statusUnsupported : messages.videoAudioSplitter.statusNoFile)
      return
    }

    if (state.errorReason) {
      setStatus(messages.videoAudioSplitter.statusError)
      return
    }

    renderInfo()
  }

  videoAudioSplitterLocaleSyncers.set(root, syncLocale)

  const loadFile = async (file: File): Promise<void> => {
    resetState()
    elements.fileName.textContent = file.name
    setStatus(messages.videoAudioSplitter.statusLoading)

    try {
      const source = new Uint8Array(await file.arrayBuffer())
      const analysis = analyzeMp4(source)
      if (!analysis.moov) {
        state.errorReason = 'unsupported'
        setStatus(messages.videoAudioSplitter.statusUnsupported)
        return
      }

      state.fileName = file.name
      state.file = file
      state.source = source
      state.duration = getMaxDurationSeconds(analysis)
      state.fragmented = analysis.fragmented
      state.trackCount = analysis.tracks.length
      state.videoTrackCount = analysis.tracks.filter((track) => track.handler === 'vide').length
      state.audioTrackCount = analysis.tracks.filter((track) => track.handler === 'soun').length

      revokePreviewUrl()
      state.previewUrl = URL.createObjectURL(file)
      elements.preview.src = state.previewUrl
      elements.preview.load()

      setProcessing(false)
      renderInfo()
    } catch {
      state.errorReason = 'parse'
      setStatus(messages.videoAudioSplitter.statusUnsupported)
      setProcessing(false)
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

  elements.audioDownload.addEventListener('click', () => {
    void handleAudioDownload()
  })

  elements.silentDownload.addEventListener('click', () => {
    void handleSilentDownload()
  })

  syncLocalizedText()
  elements.fileName.textContent = messages.videoAudioSplitter.noFileSelected
  setStatus(messages.videoAudioSplitter.statusNoFile)
  setProcessing(false)
}

export const updateVideoAudioSplitterLocale = (container: HTMLElement, messages: Messages, locale: Locale): void => {
  const root = container.querySelector<HTMLElement>('[data-video-audio-splitter-root]')
  if (!root) {
    return
  }

  videoAudioSplitterLocaleSyncers.get(root)?.(messages, locale)
}
