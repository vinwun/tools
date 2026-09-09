/**
 * Writes text to the clipboard, resolving false instead of throwing. `navigator.clipboard` is
 * absent outside secure contexts and on older browsers, so it is probed before the call.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (!navigator.clipboard?.writeText) {
      return false
    }

    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
