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

/** Zero-padded UTC wall time, e.g. "04:00 UTC". */
export function formatUTCClock(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

const UNITS = [
  { suffix: "w", seconds: 7 * 86_400 },
  { suffix: "d", seconds: 86_400 },
  { suffix: "h", seconds: 3_600 },
  { suffix: "m", seconds: 60 },
] as const

/** Largest-unit-first: one or two units, lower unit rounded to nearest. */
function formatLargestUnits(totalSeconds: number): string {
  const topIndex = UNITS.findIndex((u) => totalSeconds >= u.seconds)
  const rounded = Math.round(totalSeconds / UNITS[topIndex + 1].seconds) * UNITS[topIndex + 1].seconds
  const finalTop = UNITS.findIndex((u) => rounded >= u.seconds)
  const top = UNITS[finalTop]
  const topValue = Math.floor(rounded / top.seconds)
  const rest = rounded - topValue * top.seconds
  const lower = UNITS[finalTop + 1]
  const lowerValue = lower ? rest / lower.seconds : 0
  return lowerValue === 0
    ? `${topValue}${top.suffix}`
    : `${topValue}${top.suffix} ${lowerValue}${lower.suffix}`
}

/**
 * Human countdown, largest unit first, at most two units: "45s" | "1m 05s" |
 * "42m" | "5h 12m" | "1d 16h" | "1w 3d". With showSeconds, anything under 10
 * minutes renders "m ss" so the chip can tick; otherwise it stays at minute
 * granularity, rounding up so it never claims "0m". Above an hour the lower
 * unit is rounded to nearest (half up) and carries when full, so
 * "1d 23h 40m" reads "2d" and "6d 23h 40m" reads "1w".
 */
export function formatDistance(ms: number, showSeconds: boolean = false): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total >= 3_600) return formatLargestUnits(total)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (total >= 600) return `${minutes}m`
  if (showSeconds) {
    if (total >= 60) return `${minutes}m ${pad(seconds)}s`
    return `${seconds}s`
  }
  return `${Math.max(1, Math.ceil(total / 60))}m`
}
