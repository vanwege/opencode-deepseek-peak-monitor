export type Phase = "peak" | "off"

/** Peak windows as UTC minutes from midnight: 01:00-04:00 and 06:00-10:00. */
export const PEAK_WINDOWS = [
  { startMin: 1 * 60, endMin: 4 * 60 },
  { startMin: 6 * 60, endMin: 10 * 60 },
]

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function isWeekdayUTC(day: number): boolean {
  return day >= 1 && day <= 5
}

/**
 * DeepSeek peak billing: 01:00-04:00 and 06:00-10:00 UTC, Monday-Friday
 * (off-peak is half price; weekends are always off-peak).
 */
export function isPeakUTC(date: Date): boolean {
  if (!isWeekdayUTC(date.getUTCDay())) return false
  const minute = date.getUTCHours() * 60 + date.getUTCMinutes()
  return PEAK_WINDOWS.some((w) => minute >= w.startMin && minute < w.endMin)
}

/** First instant strictly after `now` at which the phase flips. */
export function nextBoundary(now: Date): Date {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (let day = 0; day <= 8; day++) {
    const base = dayStart + day * DAY_MS
    if (!isWeekdayUTC(new Date(base).getUTCDay())) continue
    for (const w of PEAK_WINDOWS) {
      for (const minute of [w.startMin, w.endMin]) {
        const t = base + minute * MINUTE_MS
        if (t > now.getTime()) return new Date(t)
      }
    }
  }
  throw new Error("deepseek-peak: no phase boundary found within 8 days")
}

export interface PeakState {
  readonly phase: Phase
  /** When the current phase ends: peak end, or the start of the next peak. */
  readonly boundaryAt: Date
}

export function peakState(now: Date): PeakState {
  return {
    phase: isPeakUTC(now) ? "peak" : "off",
    boundaryAt: nextBoundary(now),
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

/**
 * Human countdown: "45s" | "1m 05s" | "42m" | "5h 12m" | "2d 1h".
 * Seconds appear under 10 minutes so the chip can tick.
 */
export function formatDistance(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const dayHours = Math.floor((total % 86_400) / 3_600)
  const hours = Math.floor(total / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)
  const seconds = total % 60
  if (total >= 48 * 3_600) return dayHours === 0 ? `${days}d` : `${days}d ${dayHours}h`
  if (total >= 3_600) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
  if (total >= 600) return `${minutes}m`
  if (total >= 60) return `${minutes}m ${pad(seconds)}s`
  return `${seconds}s`
}
