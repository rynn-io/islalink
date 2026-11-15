/* Tiny formatting helpers — PHP money, weights, PHT time. */

export const PHT_OFFSET_MS = 8 * 60 * 60 * 1000

/** Demo clock: fixed so the demo is reproducible (Sunday 15 Nov 2026, 9:35am PHT). */
export const NOW = new Date('2026-11-15T09:35:00+08:00')
export const TODAY = '2026-11-15'

export const peso = (n, decimals = 0) =>
  '₱' +
  Number(n).toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export const kg = (n) => `${Number(n).toLocaleString('en-PH')} kg`

export const pct = (n, decimals = 1) => `${n > 0 ? '+' : ''}${Number(n).toFixed(decimals)}%`

/** 24h time in PHT, e.g. "04:20" */
export function phtTime(iso) {
  const d = new Date(iso)
  const local = new Date(d.getTime() + PHT_OFFSET_MS)
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
}

/** "Sat 15 Nov" */
export function phtDate(iso) {
  const d = new Date(iso)
  const local = new Date(d.getTime() + PHT_OFFSET_MS)
  return local.toLocaleDateString('en-PH', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** "15 Nov · 04:20" */
export const phtStamp = (iso) => `${phtDate(iso)} · ${phtTime(iso)}`

/** Hours between two dates, 1 decimal. */
export const hoursBetween = (a, b) => Math.round(((new Date(b) - new Date(a)) / 36e5) * 10) / 10

export function relHours(iso, now = NOW) {
  const h = hoursBetween(iso, now)
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}
