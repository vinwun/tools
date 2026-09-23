import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { downloadBlob, formatAcceptList, stripExtension } from '../../foundations/files.ts'
import { formatMessage, queryRequired } from '../../foundations/dom.ts'
import { createObjectUrlSlot } from '../../foundations/object-url.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { decodeAudioFile, encodeWav, readAudioSampleRate } from '../../audio/audio-utils.ts'
import { analyzeMp4, getMaxDurationSeconds, stripAudioTracks } from '../mp4-utils.ts'
import { ACCEPTED_VIDEO_TYPES, formatVideoSeconds } from '../video-utils.ts'
import type { VideoAudioSplitterElements, VideoAudioSplitterState } from './types.ts'

export const mountVideoAudioSplitter: MountTool = (container, initialMessages) => {
  let messages = initialMessages
  const elements = queryRequired<VideoAudioSplitterElements>(container, {
    status: '[data-video-audio-splitter-status]',
    preview: '[data-video-audio-splitter-preview]',
    durationValue: '[data-video-audio-splitter-duration]',
    formatValue: '[data-video-audio-splitter-format]',
    tracksValue: '[data-video-audio-splitter-tracks]',
    audioDownload: '[data-video-audio-splitter-audio-download]',
    silentDownload: '[data-video-audio-splitter-silent-download]',
    uploadLabel: '[data-video-audio-splitter-upload-label]',
    uploadHint: '[data-video-audio-splitter-upload-hint]',
    previewHeading: '[data-video-audio-splitter-preview-heading]',
    infoHeading: '[data-video-audio-splitter-info-heading]',
    durationLabel: '[data-video-audio-splitter-duration-label]',
    formatLabel: '[data-video-audio-splitter-format-label]',
    tracksLabel: '[data-video-audio-splitter-tracks-label]',
  })
  const filePicker = elements ? wireFilePicker(container, { onFiles: (files) => void loadFile(files[0]) }) : null
  if (!elements || !filePicker) {
    return {}
  }

  const state: VideoAudioSplitterState = {
    fileName: '',
    file: null,
    source: null,
    duration: 0,
    fragmented: false,
    trackCount: 0,
    videoTrackCount: 0,
    audioTrackCount: 0,
    isProcessing: false,
    errorReason: null,
  }

  const setStatus = (text: string): void => {
    elements.status.textContent = text
  }

  const previewUrl = createObjectUrlSlot()

  const hasAudioTrack = (): boolean => state.file !== null && state.audioTrackCount > 0

  const setProcessing = (active: boolean): void => {
    state.isProcessing = active
    const canDownload = !active && hasAudioTrack()
    elements.audioDownload.disabled = !canDownload
    elements.silentDownload.disabled = !canDownload
  }

  const renderInfo = (): void => {
    elements.durationValue.textContent = formatVideoSeconds(state.duration)
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

    previewUrl.clear()
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
    elements.uploadLabel.textContent = messages.videoAudioSplitter.uploadLabel
    elements.uploadHint.textContent = `${messages.videoAudioSplitter.uploadHintLabel}: ${formatAcceptList(ACCEPTED_VIDEO_TYPES)}`
    elements.previewHeading.textContent = messages.videoAudioSplitter.previewLabel
    elements.infoHeading.textContent = messages.videoAudioSplitter.infoTitle
    elements.durationLabel.textContent = messages.videoAudioSplitter.durationLabel
    elements.formatLabel.textContent = messages.videoAudioSplitter.formatLabel
    elements.tracksLabel.textContent = messages.videoAudioSplitter.tracksLabel
    elements.audioDownload.textContent = messages.videoAudioSplitter.audioDownloadAction
    elements.silentDownload.textContent = messages.videoAudioSplitter.silentDownloadAction
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()

    if (!state.file) {
      filePicker.setName(messages.videoAudioSplitter.noFileSelected)
      setStatus(state.errorReason ? messages.videoAudioSplitter.statusUnsupported : messages.videoAudioSplitter.statusNoFile)
      return
    }

    if (state.errorReason) {
      setStatus(messages.videoAudioSplitter.statusError)
      return
    }

    renderInfo()
  }

  const loadFile = async (file: File): Promise<void> => {
    resetState()
    filePicker.setName(file.name)
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

      elements.preview.src = previewUrl.set(file)
      elements.preview.load()

      setProcessing(false)
      renderInfo()
    } catch {
      state.errorReason = 'parse'
      setStatus(messages.videoAudioSplitter.statusUnsupported)
      setProcessing(false)
    }
  }

  elements.audioDownload.addEventListener('click', () => {
    void handleAudioDownload()
  })

  elements.silentDownload.addEventListener('click', () => {
    void handleSilentDownload()
  })

  syncLocalizedText()
  filePicker.setName(messages.videoAudioSplitter.noFileSelected)
  setStatus(messages.videoAudioSplitter.statusNoFile)
  setProcessing(false)

  return {
    updateLocale: syncLocale,
    destroy: () => {
      elements.preview.pause()
      previewUrl.clear()
    },
  }
}
