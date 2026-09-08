export type AudioCutterMode = 'keep' | 'remove'

export type AudioCutterState = {
  fileName: string
  audioBuffer: AudioBuffer | null
  duration: number
  outputSampleRate: number
  mode: AudioCutterMode
  start: number
  end: number
  playhead: number
  peaks: number[]
  sourceUrl: string | null
}

export type AudioCutterElements = {
  status: HTMLElement
  summary: HTMLElement
  waveformCanvas: HTMLCanvasElement
  selectionOverlay: HTMLElement
  playhead: HTMLButtonElement
  startHandle: HTMLElement
  endHandle: HTMLElement
  modeInputs: HTMLInputElement[]
  startInput: HTMLInputElement
  endInput: HTMLInputElement
  preview: HTMLAudioElement
  downloadLink: HTMLAnchorElement
}

export type AudioCutterHandle = 'start' | 'end' | 'playhead'
