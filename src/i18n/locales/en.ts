import type { Messages } from '../schema'

export const enMessages: Messages = {
  dashboard: {
    title: 'Tool Overview',
    subtitle: 'Pick the suitable category for your task.',
    categoriesAriaLabel: 'Tool categories',
    languageLabel: 'Language',
  },
  navigation: {
    backToDashboard: 'Back to tools',
    backToCategory: 'Back to category',
    breadcrumbAriaLabel: 'Breadcrumb',
    toolsSegment: 'tools',
    availableTools: 'Available tools',
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
      description: 'Convert files between common image formats.',
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
    audioTrim: {
      name: 'Audio Trim',
      description: 'Trim audio clips with precise start and end points.',
    },
    audioConverter: {
      name: 'Audio Converter',
      description: 'Convert audio files into other formats.',
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
