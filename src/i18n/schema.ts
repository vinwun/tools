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
    loading: string
    loadFailed: string
    retryAction: string
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
  pdfPageOrganizer: {
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
    moveLeftAction: string
    moveRightAction: string
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
    statusFailed: string
    resultsTitle: string
    resultsEmpty: string
    entryStatusReady: string
    entryStatusExtracting: string
    entryStatusFailed: string
    previewUnavailable: string
    pageLabel: string
  }
  audioCutter: {
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
  videoAudioSplitter: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    noFileSelected: string
    previewLabel: string
    infoTitle: string
    durationLabel: string
    formatLabel: string
    tracksLabel: string
    formatStandard: string
    formatFragmented: string
    tracksValue: string
    statusNoFile: string
    statusLoading: string
    statusReady: string
    statusProcessing: string
    statusError: string
    statusUnsupported: string
    alreadySilent: string
    audioDownloadAction: string
    silentDownloadAction: string
  }
  videoCutter: {
    uploadLabel: string
    uploadHintLabel: string
    browseAction: string
    noFileSelected: string
    previewLabel: string
    startLabel: string
    endLabel: string
    downloadAction: string
    playSelectionAction: string
    playEndingAction: string
    previewDurationLabel: string
    actualStartLabel: string
    selectedSummary: string
    statusNoFile: string
    statusLoading: string
    statusProcessing: string
    statusFragmented: string
    statusUnsupported: string
    statusError: string
    statusInvalidRange: string
    stepDownAction: string
    stepUpAction: string
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
    adjustHint: string
    startAction: string
    pauseAction: string
    resumeAction: string
    resetAction: string
    soundToggleLabel: string
    notifyToggleLabel: string
    completedNotification: string
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
  baseConverter: {
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
  floatingPointConverter: {
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
  markdownViewer: {
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
  textCounter: {
    inputLabel: string
    inputPlaceholder: string
    clearAction: string
    resultsTitle: string
    words: string
    characters: string
    alphanumeric: string
    letters: string
    digits: string
    numbers: string
    punctuation: string
    symbols: string
    whitespace: string
    lines: string
    paragraphs: string
    sentences: string
  }
  loremIpsumGenerator: {
    settingsLegend: string
    amountLabel: string
    unitLabel: string
    unitCharacters: string
    unitWords: string
    unitSentences: string
    unitParagraphs: string
    classicLabel: string
    generateAction: string
    copyAction: string
    copiedMessage: string
    copyFailedMessage: string
    clearAction: string
    outputLabel: string
  }
  unicodeConverter: {
    characterLabel: string
    codePointLabel: string
    decimalLabel: string
    binaryLabel: string
    octalLabel: string
    utf8Label: string
    utf16Label: string
    categoryLabel: string
    asciiLabel: string
    asciiYes: string
    asciiNo: string
    categoryLetter: string
    categoryDigit: string
    categoryPunctuation: string
    categorySymbol: string
    categoryWhitespace: string
    categoryControl: string
    categoryOther: string
  }
  hiddenCharactersInspector: {
    inputLabel: string
    inputPlaceholder: string
    clearAction: string
    insertExampleAction: string
    countLabel: string
    previewLabel: string
    emptyLabel: string
    bidiLabel: string
    zeroWidthLabel: string
    controlLabel: string
    separatorLabel: string
    confusableLabel: string
    lookalikeMessage: string
  }
  categories: Record<CategoryId, CategoryTranslation>
  tools: Record<ToolId, ToolTranslation>
}
