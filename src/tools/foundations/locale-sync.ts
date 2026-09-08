export type LocaleSyncRegistry<TArgs extends unknown[]> = {
  register: (root: HTMLElement, sync: (...args: TArgs) => void) => void
  update: (container: HTMLElement, ...args: TArgs) => void
  /**
   * Re-syncs an already mounted root and reports whether one was registered, so a mount can
   * bail out instead of wiring the same DOM twice.
   */
  resync: (root: HTMLElement, ...args: TArgs) => boolean
}

/**
 * Keeps one locale-sync callback per mounted tool root. The registry is keyed weakly so a tool
 * that gets re-rendered does not keep its previous DOM alive.
 */
export const createLocaleSyncRegistry = <TArgs extends unknown[]>(
  rootSelector: string,
): LocaleSyncRegistry<TArgs> => {
  const syncers = new WeakMap<HTMLElement, (...args: TArgs) => void>()

  return {
    register: (root, sync) => {
      syncers.set(root, sync)
    },
    resync: (root, ...args) => {
      const sync = syncers.get(root)
      sync?.(...args)
      return sync !== undefined
    },
    update: (container, ...args) => {
      // The caller may pass an ancestor of the tool root, the root itself, or a node inside it.
      const root =
        container.querySelector<HTMLElement>(rootSelector) ??
        container.closest<HTMLElement>(rootSelector) ??
        container
      syncers.get(root)?.(...args)
    },
  }
}
