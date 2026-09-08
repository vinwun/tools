import type { Messages } from '../../../i18n/schema.ts'
import type {ConverterResult, FileConverterConfig, FileConverterTool} from './types.ts'
import {mountFileConverter} from "./mount.ts";
import {renderFileConverter} from "./render.ts";
import {updateFileConverterLocale} from "./mount.ts";

export const createFileConverterTool = (config: FileConverterConfig): FileConverterTool => ({
  render: (messages: Messages): string => renderFileConverter(config, messages.fileConverter),
  mount: (container: HTMLElement, messages: Messages): void => {
    mountFileConverter(container, config, messages.fileConverter)
  },
  updateLocale: (container: HTMLElement, messages: Messages): void => {
    updateFileConverterLocale(container, messages.fileConverter)
  },
})

export const conversionFailed = (error: unknown): ConverterResult => ({
  ok: false,
  reason: 'conversionFailed',
  details: error instanceof Error ? error.message : 'Unknown conversion error',
})
