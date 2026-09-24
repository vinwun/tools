export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

// Unknown placeholders are left intact so a missing translation value stays visible.
// `{count:one|other}` picks a plural form; English and German use the singular only for 1.
export const formatMessage = (template: string, values: Record<string, string | number> = {}): string =>
  template.replace(/\{(\w+)(?::([^|}]*)\|([^}]*))?}/g, (placeholder, key: string, one?: string, other?: string) => {
    const value = values[key]
    if (value === undefined) return placeholder
    if (other === undefined) return String(value)
    return Number(value) === 1 ? (one ?? '') : other
  })

export const createUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Looks up one element per selector and returns them as a typed record, or `null` as soon as one
 * is missing, so a mount can bail out with a single check. Element types are the caller's claim,
 * the same as with `querySelector<T>`.
 */
export const queryRequired = <T extends Record<string, Element>>(
  root: ParentNode,
  selectors: { [K in keyof T]: string },
): T | null => {
  const elements: Partial<T> = {}
  for (const key in selectors) {
    const element = root.querySelector(selectors[key])
    if (!element) {
      return null
    }
    elements[key] = element as T[typeof key]
  }

  return elements as T
}
