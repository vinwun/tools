export type AudioTrimmerMode = 'keep' | 'remove'

export type AudioTrimmerState = {
  fileName: string
  audioBuffer: AudioBuffer | null
  duration: number
  outputSampleRate: number
  mode: AudioTrimmerMode
  start: number
  end: number
  peaks: number[]
  previewUrl: string | null
}

export type AudioTrimmerElements = {
  fileInput: HTMLInputElement
  browseButton: HTMLButtonElement
  dropzone: HTMLElement
  fileName: HTMLElement
  status: HTMLElement
  summary: HTMLElement
  waveformCanvas: HTMLCanvasElement
  selectionOverlay: HTMLElement
  startHandle: HTMLElement
  endHandle: HTMLElement
  modeInputs: HTMLInputElement[]
  startInput: HTMLInputElement
  endInput: HTMLInputElement
  preview: HTMLAudioElement
  downloadLink: HTMLAnchorElement
}

export type AudioTrimmerHandle = 'start' | 'end'
