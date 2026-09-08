export type ObjectUrlSlot = {
  /** Replaces the held URL, revoking the previous one first. */
  set: (source: Blob) => string
  clear: () => void
}

/**
 * Holds at most one object URL. Every blob handed to `set` replaces the previous URL and revokes
 * it, so a tool that reloads its input repeatedly cannot leak the earlier ones.
 */
export const createObjectUrlSlot = (): ObjectUrlSlot => {
  let url: string | null = null

  const clear = (): void => {
    if (url === null) {
      return
    }

    URL.revokeObjectURL(url)
    url = null
  }

  return {
    set: (source) => {
      clear()
      url = URL.createObjectURL(source)
      return url
    },
    clear,
  }
}
