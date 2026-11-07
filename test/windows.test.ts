import { test } from "node:test"
import assert from "node:assert/strict"

import { peakState, isPeakUTC, formatDistance, formatUTCClock } from "../src/windows"

const T = (iso: string) => new Date(iso)
const iso = (d: Date) => d.toISOString()

// Reference calendar (UTC): 2026-11-02 is a Monday.
// 2026-11-05 Thu, 2026-11-06 Fri, 2026-11-07 Sat, 2026-11-08 Sun, 2026-11-09 Mon.

test("isPeakUTC: windows are [01:00,04:00) and [06:00,10:00) UTC on weekdays", () => {
  assert.equal(isPeakUTC(T("2026-11-06T00:59:59Z")), false)
  assert.equal(isPeakUTC(T("2026-11-06T01:00:00Z")), true)
  assert.equal(isPeakUTC(T("2026-11-06T03:59:59Z")), true)
  assert.equal(isPeakUTC(T("2026-11-06T04:00:00Z")), false)
  assert.equal(isPeakUTC(T("2026-11-06T05:59:59Z")), false)
  assert.equal(isPeakUTC(T("2026-11-06T06:00:00Z")), true)
  assert.equal(isPeakUTC(T("2026-11-06T09:59:59Z")), true)
  assert.equal(isPeakUTC(T("2026-11-06T10:00:00Z")), false)
})

test("isPeakUTC: weekends are fully off-peak", () => {
  assert.equal(isPeakUTC(T("2026-11-07T01:30:00Z")), false) // Saturday
  assert.equal(isPeakUTC(T("2026-11-08T07:00:00Z")), false) // Sunday
})

test("peakState: mid peak returns peak and the peak block end", () => {
  const s = peakState(T("2026-11-06T03:30:00Z"))
  assert.equal(s.phase, "peak")
  assert.equal(iso(s.boundaryAt), "2026-11-06T04:00:00.000Z")
})

test("peakState: second peak block ends at 10:00", () => {
  const s = peakState(T("2026-11-06T09:30:00Z"))
  assert.equal(s.phase, "peak")
  assert.equal(iso(s.boundaryAt), "2026-11-06T10:00:00.000Z")
})

test("peakState: exactly at 04:00 the phase has flipped off, boundary is 06:00", () => {
  const s = peakState(T("2026-11-06T04:00:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-06T06:00:00.000Z")
})

test("peakState: one minute before peak start", () => {
  const s = peakState(T("2026-11-06T00:59:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-06T01:00:00.000Z")
})

test("peakState: Friday evening bridges the weekend to Monday 01:00", () => {
  const s = peakState(T("2026-11-06T22:00:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-09T01:00:00.000Z")

  const late = peakState(T("2026-11-06T23:59:00Z"))
  assert.equal(late.phase, "off")
  assert.equal(iso(late.boundaryAt), "2026-11-09T01:00:00.000Z")
})

test("peakState: Saturday afternoon still targets Monday 01:00", () => {
  const s = peakState(T("2026-11-07T12:00:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-09T01:00:00.000Z")
})

test("peakState: Sunday night targets Monday 01:00", () => {
  const s = peakState(T("2026-11-08T00:00:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-09T01:00:00.000Z")
})

test("peakState: Thursday late night crosses to Friday 01:00", () => {
  const s = peakState(T("2026-11-05T23:30:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-06T01:00:00.000Z")
})

test("peakState: weekday daytime points to next day's first peak", () => {
  const s = peakState(T("2026-11-02T10:30:00Z"))
  assert.equal(s.phase, "off")
  assert.equal(iso(s.boundaryAt), "2026-11-03T01:00:00.000Z")
})

test("peakState: boundary always lies strictly ahead of now", () => {
  const now = T("2026-11-06T05:00:00Z")
  assert.ok(peakState(now).boundaryAt.getTime() > now.getTime())
})

test("formatDistance: minute-ticking buckets", () => {
  assert.equal(formatDistance(0), "1m")
  assert.equal(formatDistance(45_000), "1m")
  assert.equal(formatDistance(60 * 60_000 - 1_000), "59m")
  assert.equal(formatDistance(59 * 60_000 + 40_000), "59m")
  assert.equal(formatDistance(2 * 3_600_000), "2h")
  assert.equal(formatDistance(5 * 3_600_000 + 12 * 60_000), "5h 12m")
  assert.equal(formatDistance(24 * 3_600_000), "1d")
  assert.equal(formatDistance(48 * 3_600_000), "2d")
  assert.equal(formatDistance(48 * 3_600_000 + 60_000), "2d")
  assert.equal(formatDistance(49 * 3_600_000), "2d 1h")
})

test("formatDistance: seconds-ticking buckets", () => {
  assert.equal(formatDistance(0, true), "0s")
  assert.equal(formatDistance(-5_000, true), "0s")
  assert.equal(formatDistance(45_000, true), "45s")
  assert.equal(formatDistance(65_000, true), "1m 05s")
  assert.equal(formatDistance(9 * 60_000 + 59_000, true), "9m 59s")
  assert.equal(formatDistance(10 * 60_000, true), "10m")
  assert.equal(formatDistance(42 * 60_000, true), "42m")
})

test("formatUTCClock: zero-padded UTC wall time", () => {
  assert.equal(formatUTCClock(T("2026-11-06T04:00:00Z")), "04:00 UTC")
  assert.equal(formatUTCClock(T("2026-11-06T10:30:00Z")), "10:30 UTC")
})

test("formatDistance: leads with the largest unit, at most two units", () => {
  const H = 3_600_000
  assert.equal(formatDistance(39 * H + 48 * 60_000), "1d 16h")
  assert.equal(formatDistance(24 * H), "1d")
  assert.equal(formatDistance(24 * H + 30 * 60_000), "1d 1h")
  assert.equal(formatDistance(25 * H + 29 * 60_000), "1d 1h")
  assert.equal(formatDistance(2 * 24 * H + 15 * H), "2d 15h")
  assert.equal(formatDistance(2 * H + 12 * 60_000 + 40_000), "2h 13m")
  assert.equal(formatDistance(5 * H + 12 * 60_000 + 40_000), "5h 13m")
  assert.equal(formatDistance(5 * H + 12 * 60_000 + 29_000), "5h 12m")
})

test("formatDistance: nearest rounding carries into the larger unit", () => {
  const H = 3_600_000
  assert.equal(formatDistance(23 * H + 59 * 60_000 + 40_000), "1d")
  assert.equal(formatDistance(47 * H + 59 * 60_000), "2d")
  assert.equal(formatDistance(1 * 24 * H + 23 * H + 40 * 60_000), "2d")
  assert.equal(formatDistance(6 * 24 * H + 23 * H + 40 * 60_000), "1w")
})

test("formatDistance: weeks are the largest unit", () => {
  const H = 3_600_000
  assert.equal(formatDistance(7 * 24 * H), "1w")
  assert.equal(formatDistance(10 * 24 * H + 5 * H), "1w 3d")
  assert.equal(formatDistance(13 * 24 * H), "1w 6d")
  assert.equal(formatDistance(1 * 7 * 24 * H + 6 * 24 * H + 23 * H + 40 * 60_000), "2w")
})
