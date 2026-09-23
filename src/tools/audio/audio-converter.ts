import type { FileConverterConfig, ConverterResult } from '../foundations/file-converter/types'
import { conversionFailed, createFileConverterTool } from '../foundations/file-converter/utils'
import { stripExtension } from '../foundations/files.ts'
import { ACCEPTED_AUDIO_TYPES, decodeAudioFile, encodeWav, isWavFile, readAudioSampleRate } from './audio-utils.ts'

const convertAudioFile = async (file: File, outputFormatId: string): Promise<ConverterResult> => {
  if (outputFormatId !== 'wav') {
    return { ok: false, reason: 'unsupportedOutput' }
  }

  if (isWavFile(file)) {
    return {
      ok: true,
      data: {
        blob: file,
        fileName: `${stripExtension(file.name)}.wav`,
        mimeType: 'audio/wav',
        previewKind: 'audio',
      },
    }
  }

  try {
    const sourceSampleRate = await readAudioSampleRate(file)
    const decodedAudio = await decodeAudioFile(file, sourceSampleRate ?? undefined)
    const wavArrayBuffer = encodeWav(
      Array.from({ length: decodedAudio.numberOfChannels }, (_, channelIndex) => decodedAudio.getChannelData(channelIndex)),
      decodedAudio.sampleRate,
    )
    const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' })

    return {
      ok: true,
      data: {
        blob: wavBlob,
        fileName: `${stripExtension(file.name)}.wav`,
        mimeType: 'audio/wav',
        previewKind: 'audio',
      },
    }
  } catch (error) {
    return conversionFailed(error)
  }
}

const audioConverterConfig: FileConverterConfig = {
  id: 'audio',
  inputAccept: ACCEPTED_AUDIO_TYPES,
  outputFormats: [
    { id: 'wav', label: 'WAV' },
  ],
  convert: convertAudioFile,
}

export const audioConverterTool = createFileConverterTool(audioConverterConfig)
