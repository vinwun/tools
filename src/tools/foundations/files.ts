export const stripExtension = (fileName: string): string => fileName.replace(/\.[^/.]+$/, '')

export const getFileExtension = (fileName: string): string | null => {
  const match = fileName.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : null
}

// Turns an accept attribute (".mp3,.wav") into the hint form (".mp3 / .wav").
export const formatAcceptList = (accept: string): string => accept.replaceAll(',', ' / ')

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsText(file)
  })
