export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => file.arrayBuffer()

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext
export const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.ogg,.m4a,.aac,.flac'

export type WavMetadata = {
  sampleRate: number
}

const getAudioContext = (sampleRate?: number): AudioContext => {
  const contextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext

  if (!contextConstructor) {
    throw new Error('AudioContext is not available in this browser')
  }

  if (typeof sampleRate === 'number' && Number.isFinite(sampleRate) && sampleRate > 0) {
    try {
      return new contextConstructor({ sampleRate })
    } catch {
      // Some browsers ignore or reject the requested rate; fall back to the default context.
    }
  }

  return new contextConstructor()
}

export const decodeAudioFile = async (file: File, sampleRate?: number): Promise<AudioBuffer> => {
  const audioContext = getAudioContext(sampleRate)

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file)
    return await audioContext.decodeAudioData(arrayBuffer)
  } finally {
    await audioContext.close()
  }
}

const readFourCC = (view: DataView, offset: number): string =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )

export const readWavMetadata = async (file: File): Promise<WavMetadata | null> => {
  const headerBuffer = await file.slice(0, 4096).arrayBuffer()
  if (headerBuffer.byteLength < 12) {
    return null
  }

  const view = new DataView(headerBuffer)
  if (readFourCC(view, 0) !== 'RIFF' || readFourCC(view, 8) !== 'WAVE') {
    return null
  }

  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const chunkId = readFourCC(view, offset)
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkDataOffset = offset + 8

    if (chunkId === 'fmt ' && chunkSize >= 16 && chunkDataOffset + 12 <= view.byteLength) {
      const sampleRate = view.getUint32(chunkDataOffset + 4, true)
      return sampleRate > 0 ? { sampleRate } : null
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2)
  }

  return null
}

const readSynchsafeInteger = (bytes: Uint8Array): number =>
  ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f)

const readId3TagSize = (bytes: Uint8Array): number =>
  bytes.length >= 10 && String.fromCharCode(bytes[0], bytes[1], bytes[2]) === 'ID3'
    ? 10 + readSynchsafeInteger(bytes.subarray(6, 10))
    : 0

const readMp3Metadata = (headerBuffer: ArrayBuffer): WavMetadata | null => {
  const bytes = new Uint8Array(headerBuffer)
  const sampleRateByVersion: Record<number, readonly number[]> = {
    0b11: [44100, 48000, 32000],
    0b10: [22050, 24000, 16000],
    0b00: [11025, 12000, 8000],
  }

  for (let offset = 0; offset + 4 <= bytes.length; offset += 1) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) {
      continue
    }

    const versionBits = (bytes[offset + 1] >> 3) & 0x03
    const sampleRateIndex = (bytes[offset + 2] >> 2) & 0x03
    if (versionBits === 0b01 || sampleRateIndex === 0b11) {
      continue
    }

    const sampleRates = sampleRateByVersion[versionBits]
    const sampleRate = sampleRates?.[sampleRateIndex]
    return sampleRate ? { sampleRate } : null
  }

  return null
}

export const isWavFile = (file: File): boolean =>
  file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.toLowerCase().endsWith('.wav')

export const readAudioSampleRate = async (file: File): Promise<number | null> => {
  if (isWavFile(file)) {
    return (await readWavMetadata(file))?.sampleRate ?? null
  }

  if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
    // The scan starts behind the ID3 tag, which cover art can make larger than the scan window.
    const tagSize = readId3TagSize(new Uint8Array(await file.slice(0, 10).arrayBuffer()))
    const headerBuffer = await file.slice(tagSize, tagSize + 131072).arrayBuffer()
    return readMp3Metadata(headerBuffer)?.sampleRate ?? null
  }

  return null
}

export const resampleChannelData = (
  channelData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
): Float32Array => {
  if (
    channelData.length === 0 ||
    sourceSampleRate <= 0 ||
    targetSampleRate <= 0 ||
    sourceSampleRate === targetSampleRate
  ) {
    return channelData.slice()
  }

  const targetLength = Math.max(1, Math.round((channelData.length * targetSampleRate) / sourceSampleRate))
  const resampledData = new Float32Array(targetLength)
  const sourceLastIndex = channelData.length - 1

  for (let targetIndex = 0; targetIndex < targetLength; targetIndex += 1) {
    const sourcePosition = (targetIndex * sourceSampleRate) / targetSampleRate
    const lowerIndex = Math.floor(sourcePosition)
    const upperIndex = Math.min(sourceLastIndex, lowerIndex + 1)
    const interpolationWeight = sourcePosition - lowerIndex
    const lowerSample = channelData[lowerIndex] ?? 0
    const upperSample = channelData[upperIndex] ?? lowerSample

    resampledData[targetIndex] = lowerSample + (upperSample - lowerSample) * interpolationWeight
  }

  return resampledData
}

const writeString = (view: DataView, offset: number, value: string): void => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

export const encodeWav = (channelData: readonly Float32Array[], sampleRate: number): ArrayBuffer => {
  const channelCount = channelData.length
  const samples = channelData.reduce((longest, current) => Math.max(longest, current.length), 0)
  const bitDepth = 16
  const blockAlign = channelCount * (bitDepth / 8)
  const byteRate = sampleRate * blockAlign
  const dataSize = samples * blockAlign
  const wavBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(wavBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // A typed array writes in platform byte order, which is little-endian (as WAV needs) in every browser.
  const pcm = new Int16Array(wavBuffer, 44, samples * channelCount)
  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channelIndex][sampleIndex] ?? 0))
      pcm[sampleIndex * channelCount + channelIndex] = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff)
    }
  }

  return wavBuffer
}
