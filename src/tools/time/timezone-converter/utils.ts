export const normalizeMinutes = (minutes: number): number => ((minutes % 1440) + 1440) % 1440

export const formatTimeInput = (minutes: number): string => {
  const safeMinutes = normalizeMinutes(minutes)
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export const parseTimeInput = (value: string): number | null => {
  const match = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

export const getLocalOffsetMinutes = (date: Date = new Date()): number => -date.getTimezoneOffset()
