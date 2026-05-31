import type { CategoryId } from '../dashboard/category-data.ts'
import type { ToolId } from '../tools/catalog'

export type CategoryTranslation = {
  name: string
  description: string
}

export type ToolTranslation = {
  name: string
  description: string
}

export type Messages = {
  dashboard: {
    title: string
    subtitle: string
    categoriesAriaLabel: string
    languageLabel: string
  }
  navigation: {
    backToDashboard: string
    backToCategory: string
    breadcrumbAriaLabel: string
    toolsSegment: string
    availableTools: string
  }
  toolPage: {
    comingSoon: string
  }
  rngNumberGenerator: {
    settingsLegend: string
    minLabel: string
    maxLabel: string
    integerModeLabel: string
    decimalModeLabel: string
    generateAction: string
  }
  rngStringGenerator: {
    listLegend: string
    listHint: string
    optionsLegend: string
    uniqueModeLabel: string
    uniqueModeHint: string
    resetAction: string
    generateAction: string
    readyMessage: string
    uniqueStatusMessage: string
    emptyStateMessage: string
    exhaustedMessage: string
  }
  fileConverter: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    noFileSelected: string
    selectedFilesLabel: string
    outputLabel: string
    converting: string
    statusNoFile: string
    statusUnsupported: string
    statusFailed: string
    downloadAllAction: string
    removePreviewItemAction: string
    previewTitle: string
    previewUnavailable: string
  }
  colorPicker: {
    squareLabel: string
    squareHint: string
    hueBarLabel: string
    hexLabel: string
    hexInputLabel: string
    hexInputPlaceholder: string
    copyHexAction: string
    copiedMessage: string
    copyFailedMessage: string
    rgbGroupLabel: string
    hslGroupLabel: string
    redLabel: string
    greenLabel: string
    blueLabel: string
    hueLabel: string
    saturationLabel: string
    lightnessLabel: string
  }
  pdfTools: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    clearAction: string
    dropHint: string
    pageListTitle: string
    emptyState: string
    documentsSummary: string
    selectedSummary: string
    keepSelectedAction: string
    removeSelectedAction: string
    downloadAction: string
    selectionHint: string
    reorderHint: string
    moveToEndHint: string
    pageEntryLabel: string
    thumbnailLoading: string
    thumbnailFailed: string
    uploadingStatus: string
  }
  pdfTextExtractor: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    noFileSelected: string
    dropHint: string
    outputTitle: string
    outputFormatMarkdown: string
    outputFormatText: string
    downloadAction: string
    statusEmpty: string
    statusExtracting: string
    statusReady: string
    statusReadySelect: string
    statusFailed: string
    resultsTitle: string
    resultsEmpty: string
    entryStatusReady: string
    entryStatusExtracting: string
    entryStatusFailed: string
    previewUnavailable: string
  }
  audioTrimmer: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    noFileSelected: string
    selectionModeLabel: string
    keepModeLabel: string
    removeModeLabel: string
    waveformLabel: string
    waveformHint: string
    playheadLabel: string
    startLabel: string
    endLabel: string
    previewTitle: string
    downloadAction: string
    statusNoFile: string
    statusLoading: string
    statusReady: string
    statusError: string
    emptySelectionWarning: string
  }
  stopwatch: {
    elapsedLabel: string
    startAction: string
    pauseAction: string
    resumeAction: string
    resetAction: string
    lapAction: string
    lapsTitle: string
    lapsCountLabel: string
    lapEntryLabel: string
    lapsEmpty: string
  }
  timer: {
    remainingLabel: string
    startAction: string
    pauseAction: string
    resumeAction: string
    resetAction: string
  }
  timezoneConverter: {
    localTimeLabel: string
    localTimeHint: string
    timeInputLabel: string
    statusCurrent: string
    statusOutdated: string
    setCurrentAction: string
    zones: Record<string, string>
  }
  primeFactorizer: {
    decimalLabel: string
    decimalHint: string
    expandedLabel: string
    expandedHint: string
    exponentLabel: string
    exponentHint: string
  }
  numericalConverter: {
    binaryLabel: string
    octalLabel: string
    decimalLabel: string
    hexLabel: string
    customBaseLabel: string
    customValueLabel: string
    romanLabel: string
  }
  aspectRatioCalculator: {
    widthLabel: string
    heightLabel: string
    reducedLabel: string
    decimalLabel: string
  }
  floatingPointInspector: {
    decimalLabel: string
    formatHalfTitle: string
    formatFloatTitle: string
    formatDoubleTitle: string
    signLabel: string
    exponentLabel: string
    mantissaLabel: string
    valueLabel: string
    deltaLabel: string
    interpretationLabel: string
    interpretationZero: string
    interpretationSubnormal: string
    interpretationNormal: string
    interpretationInfinity: string
    interpretationNaN: string
  }
  matrixMultiplier: {
    matrixALabel: string
    matrixBLabel: string
    matrixHint: string
    dimensionText: string
    dimensionPlaceholder: string
    resultLabel: string
    statusEmpty: string
    statusInvalid: string
    statusMismatch: string
    statusReady: string
  }
  jsonPrettyPrinter: {
    uploadLabel: string
    uploadHint: string
    uploadAction: string
    noFileSelected: string
    inputLabel: string
    inputPlaceholder: string
    indentLabel: string
    indentTwoLabel: string
    indentFourLabel: string
    formatAction: string
    clearAction: string
    downloadAction: string
    statusEmpty: string
    statusInvalid: string
    statusReady: string
    outputLabel: string
    collapseAction: string
    expandAction: string
  }
  markdownDisplayer: {
    uploadLabel: string
    uploadHint: string
    uploadAction: string
    noFileSelected: string
    inputLabel: string
    inputPlaceholder: string
    renderAction: string
    clearAction: string
    downloadAction: string
    statusEmpty: string
    statusReady: string
    outputLabel: string
  }
  categories: Record<CategoryId, CategoryTranslation>
  tools: Record<ToolId, ToolTranslation>
}
