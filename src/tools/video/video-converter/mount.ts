import { messagesByLocale, type Locale } from '../../../i18n'
import type { Messages } from '../../../i18n/schema.ts'
import { stripExtension } from '../../foundations/file-converter/utils'
import { decodeAudioFile, encodeWav, readAudioSampleRate } from '../../audio/audio-utils.ts'
import { analyzeMp4, getMaxDurationSeconds, stripAudioTracks } from '../mp4-utils.ts'
import { ACCEPTED_VIDEO_TYPES, downloadBlob, formatVideoSeconds } from '../video-utils.ts'
import { formatMessage } from '../../image/color-picker/utils.ts'
import type { VideoConverterElements, VideoConverterState } from './types.ts'

const videoConverterLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages, locale: Locale) => void>()

export const mountVideoConverter = (container: HTMLElement, locale: Locale): void => {
  let messages = messagesByLocale[locale]
  const root = container.querySelector<HTMLElement>('[data-video-converter-root]')
  if (!root) {
    return
  }

  const elements: VideoConverterElements = {
    fileInput: root.querySelector<HTMLInputElement>('[data-video-converter-file]') as HTMLInputElement,
    browseButton: root.querySelector<HTMLButtonElement>('[data-video-converter-browse]') as HTMLButtonElement,
    dropzone: root.querySelector<HTMLElement>('[data-video-converter-dropzone]') as HTMLElement,
    fileName: root.querySelector<HTMLElement>('[data-video-converter-file-name]') as HTMLElement,
    status: root.querySelector<HTMLElement>('[data-video-converter-status]') as HTMLElement,
    preview: root.querySelector<HTMLVideoElement>('[data-video-converter-preview]') as HTMLVideoElement,
    durationValue: root.querySelector<HTMLElement>('[data-video-converter-duration]') as HTMLElement,
    formatValue: root.querySelector<HTMLElement>('[data-video-converter-format]') as HTMLElement,
    tracksValue: root.querySelector<HTMLElement>('[data-video-converter-tracks]') as HTMLElement,
    audioDownload: root.querySelector<HTMLButtonElement>('[data-video-converter-audio-download]') as HTMLButtonElement,
    silentDownload: root.querySelector<HTMLButtonElement>('[data-video-converter-silent-download]') as HTMLButtonElement,
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

  const state: VideoConverterState = {
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
      ? messages.videoConverter.formatFragmented
      : messages.videoConverter.formatStandard
    elements.tracksValue.textContent = formatMessage(messages.videoConverter.tracksValue, {
      total: String(state.trackCount),
      video: String(state.videoTrackCount),
      audio: String(state.audioTrackCount),
    })
    setStatus(hasAudioTrack() ? messages.videoConverter.statusReady : messages.videoConverter.alreadySilent)
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
    setStatus(messages.videoConverter.statusNoFile)
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
    setStatus(messages.videoConverter.statusProcessing)

    try {
      const wavBuffer = await buildWavBuffer(state.file as File)
      downloadBlob(new Blob([wavBuffer], { type: 'audio/wav' }), `${stripExtension(state.fileName)}.wav`)
      setStatus(messages.videoConverter.statusReady)
    } catch {
      state.errorReason = 'audio'
      setStatus(messages.videoConverter.statusError)
    } finally {
      setProcessing(false)
    }
  }

  const handleSilentDownload = async (): Promise<void> => {
    if (!hasAudioTrack() || state.isProcessing || !state.source) {
      return
    }

    setProcessing(true)
    setStatus(messages.videoConverter.statusProcessing)

    try {
      const result = stripAudioTracks(state.source)
      if (!result.ok) {
        state.errorReason = result.reason
        setStatus(messages.videoConverter.statusError)
        return
      }

      downloadBlob(new Blob([result.bytes], { type: 'video/mp4' }), `${stripExtension(state.fileName)}_silent.mp4`)
      setStatus(messages.videoConverter.statusReady)
    } finally {
      setProcessing(false)
    }
  }

  const syncLocalizedText = (): void => {
    const uploadLabels = root.querySelectorAll<HTMLElement>('.video-converter-panel-main > .tool-field > span')
    const uploadHint = root.querySelectorAll<HTMLElement>('.video-converter-panel-main > .tool-hint')[0]
    const previewHeading = root.querySelector<HTMLElement>('.video-converter-preview-block h2')
    const infoHeading = root.querySelector<HTMLElement>('.video-converter-info h2')
    const infoLabels = root.querySelectorAll<HTMLElement>('.video-converter-info-row dt')

    if (uploadLabels[0]) uploadLabels[0].textContent = messages.videoConverter.uploadLabel
    if (uploadHint) uploadHint.textContent = `${messages.videoConverter.uploadHintLabel}: ${ACCEPTED_VIDEO_TYPES.replaceAll(',', ' / ')}`
    if (previewHeading) previewHeading.textContent = messages.videoConverter.previewLabel
    if (infoHeading) infoHeading.textContent = messages.videoConverter.infoTitle
    if (infoLabels[0]) infoLabels[0].textContent = messages.videoConverter.durationLabel
    if (infoLabels[1]) infoLabels[1].textContent = messages.videoConverter.formatLabel
    if (infoLabels[2]) infoLabels[2].textContent = messages.videoConverter.tracksLabel
    elements.browseButton.textContent = messages.videoConverter.browseAction
    elements.audioDownload.textContent = messages.videoConverter.audioDownloadAction
    elements.silentDownload.textContent = messages.videoConverter.silentDownloadAction
  }

  const syncLocale = (nextMessages: Messages, nextLocale: Locale): void => {
    messages = nextMessages
    state.locale = nextLocale
    syncLocalizedText()

    if (!state.file) {
      elements.fileName.textContent = messages.videoConverter.noFileSelected
      setStatus(state.errorReason ? messages.videoConverter.statusUnsupported : messages.videoConverter.statusNoFile)
      return
    }

    if (state.errorReason) {
      setStatus(messages.videoConverter.statusError)
      return
    }

    renderInfo()
  }

  videoConverterLocaleSyncers.set(root, syncLocale)

  const loadFile = async (file: File): Promise<void> => {
    resetState()
    elements.fileName.textContent = file.name
    setStatus(messages.videoConverter.statusLoading)

    try {
      const source = new Uint8Array(await file.arrayBuffer())
      const analysis = analyzeMp4(source)
      if (!analysis.moov) {
        state.errorReason = 'unsupported'
        setStatus(messages.videoConverter.statusUnsupported)
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
      setStatus(messages.videoConverter.statusUnsupported)
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
  elements.fileName.textContent = messages.videoConverter.noFileSelected
  setStatus(messages.videoConverter.statusNoFile)
  setProcessing(false)
}

export const syncVideoConverterLocale = (container: HTMLElement, messages: Messages, locale: Locale): void => {
  const root = container.querySelector<HTMLElement>('[data-video-converter-root]')
  if (!root) {
    return
  }

  videoConverterLocaleSyncers.get(root)?.(messages, locale)
}
