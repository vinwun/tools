import type { Messages } from '../schema'

export const deMessages: Messages = {
  dashboard: {
    title: 'Werkzeug-Übersicht',
    subtitle: 'Wähle das passende Werkzeug für deine Aufgabe.',
    categoriesAriaLabel: 'Tool-Kategorien',
    languageLabel: 'Sprache',
  },
  navigation: {
    backToDashboard: 'Zurück zu Tools',
    backToCategory: 'Zurück zur Kategorie',
    breadcrumbAriaLabel: 'Brotkrumenpfad',
    toolsSegment: 'tools',
    availableTools: 'Verfügbare Tools',
  },
  categories: {
    image: {
      name: 'Bild',
      description: 'Bilder schnell konvertieren und analysieren.',
    },
    pdf: {
      name: 'PDF',
      description: 'PDF-Dateien verwalten.',
    },
    audio: {
      name: 'Audio',
      description: 'Audioausschnitte bearbeiten und konvertieren.',
    },
    rng: {
      name: 'Zufall',
      description: 'Zufällige Zahlen und Wörter erzeugen.',
    },
    time: {
      name: 'Zeit',
      description: 'Zeit messen und umrechnen.',
    },
    math: {
      name: 'Mathe',
      description: 'Mathematische Berechnungen und Umwandlungen durchführen.',
    },
    text: {
      name: 'Text',
      description: 'Textbasierte Formate analysieren, konvertieren und darstellen.',
    },
  },
  tools: {
    imageConverter: {
      name: 'Bildkonverter',
      description: 'Dateien zwischen gängigen Bildformaten umwandeln.',
    },
    colorPicker: {
      name: 'Farbwähler',
      description: 'Farben auswählen und Werte direkt ablesen.',
    },
    pdfMergeReorder: {
      name: 'PDF zusammenführen & sortieren',
      description: 'Mehrere PDFs zusammenführen und deren Reihenfolge ändern.',
    },
    pdfSplit: {
      name: 'PDF teilen',
      description: 'Einzelne Seiten oder Bereiche aus PDFs entfernen.',
    },
    pdfTextExtractor: {
      name: 'PDF-Text-Extraktor',
      description: 'Text aus PDF-Dokumenten auslesen.',
    },
    audioTrim: {
      name: 'Audio zuschneiden',
      description: 'Audioausschnitte präzise mit Start- und Endpunkt kürzen.',
    },
    audioConverter: {
      name: 'Audiokonverter',
      description: 'Audiodateien in andere Formate umwandeln.',
    },
    numberGenerator: {
      name: 'Zahlen-Generator',
      description: 'Zufällige Zahlen in einem Intervall generieren.',
    },
    stringGenerator: {
      name: 'Wort-Generator',
      description: 'Zufällige Zeichenketten aus einer Liste auswählen.',
    },
    timer: {
      name: 'Timer',
      description: 'Für einer Zeitspanne herunterzählen.',
    },
    timezoneConverter: {
      name: 'Zeitzonen-Umrechner',
      description: 'Zeitangaben zwischen Zeitzonen umrechnen.',
    },
    stopwatch: {
      name: 'Stoppuhr',
      description: 'Zeitmessung mit Start, Stopp und Runden.',
    },
    primeFactorizer: {
      name: 'Primfaktorzerlegung',
      description: 'Zahlen in ihre Primfaktoren zerlegen.',
    },
    baseConverter: {
      name: 'Basis-Konverter',
      description: 'Zahlen zwischen Zahlensystemen umrechnen.',
    },
    aspectRatioCalculator: {
      name: 'Seitenverhältnis-Rechner',
      description: 'Bild- und Displayformate schnell bestimmen.',
    },
    jsonValidatorPrettyPrinter: {
      name: 'JSON-Syntaxprüfung & Darsteller',
      description: 'JSON prüfen, formatieren und lesbar darstellen.',
    },
    csvValidatorPrettyPrinter: {
      name: 'CSV-Syntaxprüfung & Darsteller',
      description: 'CSV prüfen, formatieren und lesbar darstellen.',
    },
    jsonCsvConverter: {
      name: 'JSON-CSV-Konverter',
      description: 'JSON und CSV ineinander umwandeln.',
    },
    markdownPreview: {
      name: 'Markdown-Vorschau',
      description: 'Markdown während des Tippens anzeigen.',
    },
    textCounters: {
      name: 'Textzähler',
      description: 'Zeichen, Wörter und weitere Statistiken eines Textes zählen.',
    },
  },
}

