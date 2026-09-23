import type { Messages } from '../i18n/schema.ts'

export type MountedTool = {
  updateLocale?: (messages: Messages) => void
  // Stops what outlives the tool's DOM: timers, global listeners, object URLs, media.
  destroy?: () => void
}

export type MountTool = (container: HTMLElement, messages: Messages) => MountedTool

export type ToolDefinition = { render: (messages: Messages) => string } & (
  | { mount: MountTool }
  // Tools with heavy dependencies fetch their mount code on first use.
  | { load: () => Promise<MountTool> }
)
