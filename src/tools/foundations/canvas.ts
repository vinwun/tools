export const setCanvasSize = (canvas: HTMLCanvasElement): { width: number; height: number } => {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))

  if (canvas.width !== width) {
    canvas.width = width
  }

  if (canvas.height !== height) {
    canvas.height = height
  }

  return { width, height }
}

