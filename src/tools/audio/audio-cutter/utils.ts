import type { Messages } from '../../../i18n/schema'
import { setCanvasSize } from '../../foundations/canvas.ts'
import type { AudioCutterMode } from './types.ts'

export const MIN_SELECTION_SECONDS = 0.01

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const formatTime = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const totalCentiseconds = Math.round(safeSeconds * 100)
  const minutes = Math.floor(totalCentiseconds / 6000)
  const remainingCentiseconds = totalCentiseconds % 6000
  const wholeSeconds = Math.floor(remainingCentiseconds / 100)
  const centiseconds = remainingCentiseconds % 100

  return `${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`
}

export const parseTimeInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') {
    return null
  }

  if (!normalized.includes(':')) {
    const seconds = Number(normalized)
    return Number.isFinite(seconds) ? Math.max(0, seconds) : null
  }

  const segments = normalized.split(':').map((segment) => segment.trim())
  if (segments.length < 2 || segments.length > 3 || segments.some((segment) => segment === '')) {
    return null
  }

  const parsedSegments = segments.map((segment) => Number(segment))
  if (parsedSegments.some((segment) => !Number.isFinite(segment))) {
    return null
  }

  if (segments.length === 2) {
    const [minutes, seconds] = parsedSegments
    return Math.max(0, minutes * 60 + seconds)
  }

  const [hours, minutes, seconds] = parsedSegments
  return Math.max(0, hours * 3600 + minutes * 60 + seconds)
}

export const getWaveformBarCount = (canvas: HTMLCanvasElement): number => {
  const width = Math.max(1, canvas.getBoundingClientRect().width)
  return clamp(Math.round(width / 4), 96, 720)
}


export const normalizeSelection = (
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } => {
  const safeDuration = Math.max(0, duration)
  if (safeDuration === 0) {
    return { start: 0, end: 0 }
  }

  const lowerBound = clamp(Math.min(start, end), 0, safeDuration)
  const upperBound = clamp(Math.max(start, end), 0, safeDuration)
  const minimumGap = Math.min(MIN_SELECTION_SECONDS, safeDuration)

  if (upperBound - lowerBound >= minimumGap) {
    return { start: lowerBound, end: upperBound }
  }

  if (lowerBound + minimumGap <= safeDuration) {
    return { start: lowerBound, end: lowerBound + minimumGap }
  }

  return {
    start: Math.max(0, safeDuration - minimumGap),
    end: safeDuration,
  }
}

export const computePeaks = (audioBuffer: AudioBuffer, barCount: number): number[] => {
  const peaks = Array.from({ length: barCount }, () => 0)
  const channelData = Array.from({ length: audioBuffer.numberOfChannels }, (_, channelIndex) =>
    audioBuffer.getChannelData(channelIndex),
  )

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const startIndex = Math.floor((barIndex / barCount) * audioBuffer.length)
    const endIndex = Math.max(startIndex + 1, Math.floor(((barIndex + 1) / barCount) * audioBuffer.length))
    let totalSquared = 0
    let sampleCount = 0

    for (let sampleIndex = startIndex; sampleIndex < endIndex; sampleIndex += 1) {
      for (let channelIndex = 0; channelIndex < channelData.length; channelIndex += 1) {
        const sample = channelData[channelIndex][sampleIndex] ?? 0
        totalSquared += sample * sample
        sampleCount += 1
      }
    }

    peaks[barIndex] = sampleCount === 0 ? 0 : Math.sqrt(totalSquared / sampleCount)
  }

  return peaks
}

export const drawWaveform = (
  canvas: HTMLCanvasElement,
  peaks: number[],
  selection: { start: number; end: number },
  mode: AudioCutterMode,
): void => {
  const { width, height } = setCanvasSize(canvas)
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#F9FAFB'
  context.fillRect(0, 0, width, height)

  const selectionStartX = width * selection.start
  const selectionEndX = width * selection.end
  const selectedColor = mode === 'keep' ? '#2563EB' : '#C2410C'
  const waveColor = '#94A3B8'
  const selectedWaveColor = mode === 'keep' ? '#1D4ED8' : '#9A3412'
  const baselineColor = '#CBD5E1'
  const barGap = Math.max(1, Math.round(width / Math.max(peaks.length, 1) * 0.14))
  const barWidth = Math.max(1, Math.floor(width / Math.max(peaks.length, 1)) - barGap)
  const tallestPeak = Math.max(...peaks, 0)
  const maxBarHeight = tallestPeak > 0 ? (height * 0.72) / tallestPeak : height * 0.72

  context.fillStyle = `${selectedColor}1A`
  context.fillRect(selectionStartX, 0, Math.max(0, selectionEndX - selectionStartX), height)

  context.strokeStyle = baselineColor
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, height / 2)
  context.lineTo(width, height / 2)
  context.stroke()

  const centerY = height / 2

  peaks.forEach((peak, barIndex) => {
    const x = (barIndex / peaks.length) * width
    const barHeight = Math.max(1, peak * maxBarHeight)
    const y = centerY - barHeight / 2
    const isSelected = x + barWidth / 2 >= selectionStartX && x + barWidth / 2 <= selectionEndX

    context.fillStyle = isSelected ? selectedWaveColor : waveColor
    context.fillRect(Math.round(x), Math.round(y), Math.max(1, barWidth), Math.max(1, barHeight))
  })
}

export const buildCutterChannelData = (
  audioBuffer: AudioBuffer,
  start: number,
  end: number,
  mode: AudioCutterMode,
): Float32Array[] => {
  const startSample = clamp(Math.floor(start * audioBuffer.sampleRate), 0, audioBuffer.length)
  const endSample = clamp(Math.ceil(end * audioBuffer.sampleRate), 0, audioBuffer.length)

  return Array.from({ length: audioBuffer.numberOfChannels }, (_, channelIndex) => {
    const channelData = audioBuffer.getChannelData(channelIndex)
    const beforeSelection = channelData.slice(0, startSample)
    const selectedSection = channelData.slice(startSample, endSample)
    const afterSelection = channelData.slice(endSample)

    if (mode === 'keep') {
      return selectedSection
    }

    const combined = new Float32Array(beforeSelection.length + afterSelection.length)
    combined.set(beforeSelection, 0)
    combined.set(afterSelection, beforeSelection.length)
    return combined
  })
}

export const renderCutterSelectionLabel = (
  messages: Messages,
  mode: AudioCutterMode,
  start: number,
  end: number,
  duration: number,
): string => {
  const selectedDuration = mode === 'keep' ? Math.max(0, end - start) : Math.max(0, duration - (end - start))
  const actionLabel = mode === 'keep' ? messages.audioCutter.keepModeLabel : messages.audioCutter.removeModeLabel

  return `${actionLabel}: ${formatTime(start)} – ${formatTime(end)} (${formatTime(selectedDuration)})`
}
