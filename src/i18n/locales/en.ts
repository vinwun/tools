import type { Messages } from '../schema'

export const enMessages: Messages = {
  dashboard: {
    title: 'Tool Overview',
    subtitle: 'Pick the suitable categories for your task.',
    categoriesAriaLabel: 'Tool categories',
    languageLabel: 'Language',
  },
  navigation: {
    backToDashboard: 'Back to tools',
    backToCategory: 'Back to categories',
    breadcrumbAriaLabel: 'Breadcrumb',
    toolsSegment: 'tools',
    availableTools: 'Available tools',
  },
  toolPage: {
    comingSoon: 'This tool page is prepared and will be implemented next.',
  },
  colorPicker: {
    heading: 'Color Picker',
    selectedColorLabel: 'Selected color',
    openPickerAction: 'Jump to the color controls',
    squareLabel: 'Color square',
    squareHint: 'Drag inside the fields to change the color.',
    hueBarLabel: 'Hue bar',
    hueBarHint: 'Drag the bar to change the hue.',
    hexLabel: 'Hex',
    hexInputLabel: 'Hex value',
    hexInputPlaceholder: '#RRGGBB',
    copyHexAction: 'Copy hex value',
    copiedMessage: 'Copied {hex} to clipboard.',
    copyFailedMessage: 'Could not copy the hex value.',
    rgbGroupLabel: 'RGB',
    hslGroupLabel: 'HSL',
    redLabel: 'Red',
    greenLabel: 'Green',
    blueLabel: 'Blue',
    hueLabel: 'Hue',
    saturationLabel: 'Saturation',
    lightnessLabel: 'Lightness',
  },
  fileConverter: {
    uploadLabel: 'Input file(s)',
    uploadHintLabel: 'Accepted input',
    browseAction: 'Browse files',
    noFileSelected: 'No file selected',
    selectedFilesLabel: '{count} files selected',
    outputLabel: 'Output format',
    converting: 'Converting...',
    statusNoFile: 'Please select a file to start.',
    statusUnsupported: 'This output format is currently not supported in the browser.',
    statusFailed: 'Conversion failed',
    downloadAllAction: 'Download all',
    removePreviewItemAction: 'Remove preview item',
    previewTitle: 'Preview & download',
    previewUnavailable: 'Preview is not available yet.',
  },
  audioTrimmer: {
    uploadLabel: 'Audio file',
    uploadHintLabel: 'Accepted input',
    browseAction: 'Browse files',
    noFileSelected: 'No file selected',
    selectionModeLabel: 'Selection mode',
    keepModeLabel: 'Keep selected segment',
    removeModeLabel: 'Remove selected segment',
    waveformLabel: 'Waveform',
    waveformHint: 'The bars show louder and quieter sections. Use the controls to choose the time range.',
    startLabel: 'Start',
    endLabel: 'End',
    previewTitle: 'Preview & download',
    downloadAction: 'Download WAV',
    statusNoFile: 'Please select an audio file to start.',
    statusLoading: 'Decoding audio...',
    statusReady: 'Audio preview is ready.',
    statusError: 'Could not load this audio file.',
    emptySelectionWarning: 'The current remove selection would export silence only.',
  },
  categories: {
    image: {
      name: 'Image',
      description: 'Convert and inspect image assets quickly.',
    },
    pdf: {
      name: 'PDF',
      description: 'Manage PDF files.',
    },
    audio: {
      name: 'Audio',
      description: 'Edit and convert audio snippets.',
    },
    rng: {
      name: 'RNG',
      description: 'Generate random numbers and words.',
    },
    time: {
      name: 'Time',
      description: 'Track and convert time.',
    },
    math: {
      name: 'Math',
      description: 'Solve mathematical calculations and transformations.',
    },
    text: {
      name: 'Text',
      description: 'Analyse, convert, and preview text-based formats.',
    },
  },
  tools: {
    imageConverter: {
      name: 'Image Converter',
      description: 'Convert image files into .png / .jpg / .webp.',
    },
    colorPicker: {
      name: 'Color Picker',
      description: 'Pick a color and inspect its values instantly.',
    },
    pdfMergeReorder: {
      name: 'PDF Merge & Reorder',
      description: 'Combine multiple PDFs and arrange them in a different order.',
    },
    pdfSplit: {
      name: 'PDF Split',
      description: 'Remove single pages or ranges from a PDF.',
    },
    pdfTextExtractor: {
      name: 'PDF Text Extractor',
      description: 'Extract readable text from PDF documents.',
    },
    audioConverter: {
      name: 'Audio Converter',
      description: 'Convert audio files into .wav.',
    },
    audioTrimmer: {
      name: 'Audio Trimmer',
      description: 'Trim audio clips with precise start and end points.',
    },
    numberGenerator: {
      name: 'Number Generator',
      description: 'Generate random numbers in a range.',
    },
    stringGenerator: {
      name: 'String Generator',
      description: 'Select random strings out of a list.',
    },
    timer: {
      name: 'Timer',
      description: 'Count down for a duration.',
    },
    timezoneConverter: {
      name: 'Timezone Converter',
      description: 'Convert times between different time zones.',
    },
    stopwatch: {
      name: 'Stopwatch',
      description: 'Measure time with start, stop, and lap controls.',
    },
    primeFactorizer: {
      name: 'Prime Factorizer',
      description: 'Break numbers into their prime factors.',
    },
    baseConverter: {
      name: 'Base Converter',
      description: 'Convert numbers between numeral systems.',
    },
    aspectRatioCalculator: {
      name: 'Aspect Ratio Calculator',
      description: 'Determine screen and image aspect ratios quickly.',
    },
    jsonValidatorPrettyPrinter: {
      name: 'JSON Validator & Pretty Printer',
      description: 'Validate JSON and format it for readability.',
    },
    csvValidatorPrettyPrinter: {
      name: 'CSV Validator & Pretty Printer',
      description: 'Validate CSV data and format it cleanly.',
    },
    jsonCsvConverter: {
      name: 'JSON-CSV Converter',
      description: 'Convert JSON and CSV into each other.',
    },
    markdownPreview: {
      name: 'Markdown Preview',
      description: 'Preview Markdown content as you type.',
    },
    textCounters: {
      name: 'Text Counters',
      description: 'Count characters, words, and other statistics of a text.',
    },
  },
}
