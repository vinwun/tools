import type { Messages } from '../schema'

export const deMessages: Messages = {
  dashboard: {
    title: 'Werkzeug-Übersicht',
    subtitle: 'Wähle das passende Werkzeug für deine Aufgabe.',
    categoriesAriaLabel: 'Tool-Kategorien',
    languageLabel: 'Sprache',
  },
  categories: {
    image: {
      name: 'Bild',
      description: 'Bilder schnell konvertieren und analysieren.',
      tools: ['Bildkonverter', 'Farbwähler'],
    },
    pdf: {
      name: 'PDF',
      description: 'PDF-Dateien verwalten.',
      tools: ['PDF zusammenführen & sortieren', 'PDF teilen', 'PDF-Text-Extraktor'],
    },
    audio: {
      name: 'Audio',
      description: 'Audioausschnitte bearbeiten und konvertieren.',
      tools: ['Audiokonverter', 'Audio zuschneiden'],
    },
    rng: {
      name: 'Zufall',
      description: 'Zufallszahlen und Zeichenketten erzeugen.',
      tools: ['Zahlen-Generator', 'Wort-Generator'],
    },
    time: {
      name: 'Zeit',
      description: 'Zeit messen und umrechnen.',
      tools: ['Timer', 'Stoppuhr', 'Zeitzonen-Umrechner'],
    },
    math: {
      name: 'Mathe',
      description: 'Mathematische Berechnungen und Umwandlungen durchführen.',
      tools: ['Primfaktorzerlegung', 'Basis-Konverter', 'Seitenverhältnis-Rechner'],
    },
    text: {
      name: 'Text',
      description: 'Textbasierte Formate analysieren, konvertieren und darstellen.',
      tools: [
        'JSON-Syntaxprüfung & Darsteller',
        'CSV-Syntaxprüfung & Darsteller',
        'JSON <-> CSV-Konverter',
        'Markdown-Vorschau',
        'Markdown-Export',
        'Textzähler',
      ],
    },
  },
}

