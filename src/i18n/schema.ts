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
  colorPicker: {
    heading: string
    selectedColorLabel: string
    openPickerAction: string
    squareLabel: string
    squareHint: string
    hueBarLabel: string
    hueBarHint: string
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
  categories: Record<CategoryId, CategoryTranslation>
  tools: Record<ToolId, ToolTranslation>
}

