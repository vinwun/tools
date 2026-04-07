import type { Messages } from '../schema'

export const enMessages: Messages = {
  dashboard: {
    title: 'Tool Overview',
    subtitle: 'Pick the suitable category for your task.',
    categoriesAriaLabel: 'Tool categories',
    languageLabel: 'Language',
  },
  categories: {
    image: {
      name: 'Image',
      description: 'Convert and inspect image assets quickly.',
      tools: ['Image Converter', 'Color Picker'],
    },
    pdf: {
      name: 'PDF',
      description: 'Manage PDF files.',
      tools: ['PDF Merge & Reorder', 'PDF Split', 'PDF Text Extractor'],
    },
    audio: {
      name: 'Audio',
      description: 'Edit and convert audio snippets.',
      tools: ['Audio Converter', 'Audio Trimmer'],
    },
    rng: {
      name: 'RNG',
      description: 'Generate random numbers and strings.',
      tools: ['Number Generator', 'String Generator'],
    },
    time: {
      name: 'Time',
      description: 'Track and convert time.',
      tools: ['Timer', 'Stopwatch', 'Timezone Converter'],
    },
    math: {
      name: 'Math',
      description: 'Solve mathematical calculations and transformations.',
      tools: ['Prime Factorizer', 'Base Converter', 'Aspect Ratio Calculator'],
    },
    text: {
      name: 'Text',
      description: 'Analyse, convert, and preview text-based formats.',
      tools: [
        'JSON Validator & Pretty Printer',
        'CSV Validator & Pretty Printer',
        'JSON <-> CSV Converter',
        'Markdown Preview',
        'Markdown Export',
        'Text Counters',
      ],
    },
  },
}

