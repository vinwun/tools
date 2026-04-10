import type { Messages } from '../../../i18n/schema.ts'
import type {ConverterMessages, FileConverterConfig} from './types.ts'
import {mountFileConverter} from "./mount.ts";
import {renderFileConverter} from "./render.ts";

export const mapFileConverterMessages = (messages: Messages): ConverterMessages => ({
  uploadLabel: messages.fileConverter.uploadLabel,
  uploadHintLabel: messages.fileConverter.uploadHintLabel,
  browseAction: messages.fileConverter.browseAction,
  noFileSelected: messages.fileConverter.noFileSelected,
  selectedFilesLabel: messages.fileConverter.selectedFilesLabel,
  outputLabel: messages.fileConverter.outputLabel,
  converting: messages.fileConverter.converting,
  statusNoFile: messages.fileConverter.statusNoFile,
  statusUnsupported: messages.fileConverter.statusUnsupported,
  statusFailed: messages.fileConverter.statusFailed,
  downloadAllAction: messages.fileConverter.downloadAllAction,
  removePreviewItemAction: messages.fileConverter.removePreviewItemAction,
  previewTitle: messages.fileConverter.previewTitle,
  previewUnavailable: messages.fileConverter.previewUnavailable,
})

export const createFileConverterTool = (config: FileConverterConfig) => ({
  render: (messages: Messages): string => renderFileConverter(config, mapFileConverterMessages(messages)),
  mount: (container: HTMLElement, messages: Messages): void => {
    mountFileConverter(container, config, mapFileConverterMessages(messages))
  },
})

export const stripExtension = (fileName: string): string => fileName.replace(/\.[^/.]+$/, '')
