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
  toolPage: {
    comingSoon: 'Diese Tool-Seite ist vorbereitet und wird als Nächstes umgesetzt.',
  },
  colorPicker: {
    heading: 'Farbwähler',
    selectedColorLabel: 'Ausgewählte Farbe',
    openPickerAction: 'Zu den Farbfeldern springen',
    squareLabel: 'Farbfeld',
    squareHint: 'Ziehe in den Feldern, um die Farbe zu ändern.',
    hueBarLabel: 'Farbton-Balken',
    hueBarHint: 'Ziehe den Balken, um den Farbton zu ändern.',
    hexLabel: 'Hex',
    hexInputLabel: 'Hex-Wert',
    hexInputPlaceholder: '#RRGGBB',
    copyHexAction: 'Hex-Wert kopieren',
    copiedMessage: '{hex} in die Zwischenablage kopiert.',
    copyFailedMessage: 'Der Hex-Wert konnte nicht kopiert werden.',
    rgbGroupLabel: 'RGB',
    hslGroupLabel: 'HSL',
    redLabel: 'Rot',
    greenLabel: 'Grün',
    blueLabel: 'Blau',
    hueLabel: 'Farbton',
    saturationLabel: 'Sättigung',
    lightnessLabel: 'Helligkeit',
  },
  fileConverter: {
    uploadLabel: 'Eingabedatei(en)',
    uploadHintLabel: 'Akzeptierte Eingabe',
    browseAction: 'Dateien durchsuchen',
    noFileSelected: 'Keine Datei ausgewählt',
    selectedFilesLabel: '{count} Dateien ausgewählt',
    outputLabel: 'Ausgabeformat',
    converting: 'Konvertiere...',
    statusNoFile: 'Bitte eine Datei zum Start auswählen.',
    statusUnsupported: 'Dieses Ausgabeformat wird im Browser aktuell nicht unterstützt.',
    statusFailed: 'Konvertierung fehlgeschlagen',
    downloadAllAction: 'Alle herunterladen',
    removePreviewItemAction: 'Vorschau entfernen',
    previewTitle: 'Vorschau und Download',
    previewUnavailable: 'Noch keine Vorschau verfügbar.',
  },
  audioTrimmer: {
    uploadLabel: 'Audiodatei',
    uploadHintLabel: 'Akzeptierte Eingabe',
    browseAction: 'Dateien durchsuchen',
    noFileSelected: 'Keine Datei ausgewählt',
    selectionModeLabel: 'Auswahlmodus',
    keepModeLabel: 'Markierten Bereich behalten',
    removeModeLabel: 'Markierten Bereich entfernen',
    waveformLabel: 'Waveform',
    waveformHint: 'Die Balken zeigen lautere und leisere Stellen. Mit den Reglern wählst du den Zeitbereich.',
    startLabel: 'Start',
    endLabel: 'Ende',
    previewTitle: 'Vorschau und Download',
    downloadAction: 'WAV herunterladen',
    statusNoFile: 'Bitte zuerst eine Audiodatei auswählen.',
    statusLoading: 'Audio wird dekodiert...',
    statusReady: 'Die Audiovorschau ist bereit.',
    statusError: 'Diese Audiodatei konnte nicht geladen werden.',
    emptySelectionWarning: 'Die aktuelle Entfernen-Auswahl würde nur Stille exportieren.',
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
      name: 'Bild-Konverter',
      description: 'Bild-Dateien in .png / .jpg / .webp umwandeln.',
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
    audioConverter: {
      name: 'Audio-Konverter',
      description: 'Audio-Dateien in .wav umwandeln.',
    },
    audioTrimmer: {
      name: 'Audio zuschneiden',
      description: 'Audioausschnitte präzise mit Start- und Endpunkt kürzen.',
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

