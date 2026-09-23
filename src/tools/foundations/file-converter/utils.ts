import type { ToolDefinition } from '../../types.ts'
import type { ConverterResult, FileConverterConfig } from './types.ts'
import { mountFileConverter } from './mount.ts'
import { renderFileConverter } from './render.ts'

export const createFileConverterTool = (config: FileConverterConfig): ToolDefinition => ({
  render: (messages) => renderFileConverter(config, messages.fileConverter),
  mount: (container, messages) => {
    const mounted = mountFileConverter(container, config, messages.fileConverter)
    return {
      updateLocale: (nextMessages) => mounted.updateLocale?.(nextMessages.fileConverter),
      destroy: mounted.destroy,
    }
  },
})

export const conversionFailed = (error: unknown): ConverterResult => ({
  ok: false,
  reason: 'conversionFailed',
  details: error instanceof Error ? error.message : 'Unknown conversion error',
})
