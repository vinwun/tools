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

// The technical detail is English and only useful for debugging, so it goes to the console.
export const conversionFailed = (error: unknown): ConverterResult => {
  console.error(error)
  return { ok: false, reason: 'conversionFailed' }
}
