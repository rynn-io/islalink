/**
 * IsdaLink — deterministic seafood price-forecasting engine.
 *
 * Pure functions only: no dependencies, no clock reads, no unseeded randomness.
 * Every number derives from a hash of (speciesId + date), so the same call always
 * returns identical output — across renders, reloads and machines.
 */

const DAY_MS = 86_400_000
const DEFAULT_TODAY = '2026-11-15'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Calendar demand lift (fiestas, Christmas, New Year) by month index. */
const MONTH_DEMAND = [0.055, 0.005, 0.02, 0.035, 0.05, 0.03, 0.015, 0.02, 0.03, 0.045, 0.06, 0.115]
/** Typhoon-season supply tightness by month index (Jun–Nov only). */
const MONTH_TYPHOON = [0, 0, 0, 0, 0, 0.04, 0.075, 0.09, 0.075, 0.055, 0.045, 0.02]

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
/** Both tables are read against their annual mean, so a normal month contributes 0. */
const DEMAND_BASE = mean(MONTH_DEMAND)
const TYPHOON_BASE = mean(MONTH_TYPHOON)

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const peso = (n) => Math.round(n)
const oneDp = (n) => Math.round(n * 10) / 10
const signed = (n) => `${n > 0 ? '+' : ''}${n}`
const dir = (v, eps = 0.004) => (v > eps ? 'up' : v < -eps ? 'down' : 'flat')

/* ---------- deterministic primitives ---------- */

/** FNV-1a 32-bit hash — stable numeric seed for a string. */
function hash32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 PRNG — small, fast, fully reproducible from a 32-bit seed. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seeded noise in [-1, 1] for a (key, date, channel) triple. */
const noise = (key, iso, channel) => mulberry32(hash32(`${key}|${iso}|${channel}`))() * 2 - 1

/* ---------- date helpers (UTC only, so the local timezone never leaks in) ---------- */

const ymdToIndex = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
const isoOf = (idx) => new Date(idx * DAY_MS).toISOString().slice(0, 10)
const monthOf = (idx) => new Date(idx * DAY_MS).getUTCMonth()
const yearOf = (idx) => new Date(idx * DAY_MS).getUTCFullYear()
const dowOf = (idx) => new Date(idx * DAY_MS).getUTCDay()
const dayOfYear = (idx) => idx - ymdToIndex(yearOf(idx), 1, 1) + 1

function parseIndex(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) throw new TypeError(`Expected ISO date 'YYYY-MM-DD', got '${iso}'`)
  return ymdToIndex(y, m, d)
}

/** Gregorian Easter Sunday (Meeus/Jones/Butcher) as a day index. */
function easterIndex(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114
  return ymdToIndex(year, Math.floor(n / 31), (n % 31) + 1)
}

/** 0..1 demand lift for Holy Week (Semana Santa), peaking Thu–Sat. */
function holyWeekLift(idx) {
  const diff = idx - easterIndex(yearOf(idx))
  return diff >= -9 && diff <= 1 ? clamp(1 - Math.abs(diff + 4) / 5, 0, 1) : 0
}

/* ---------- species catalogue: PHP per kilo, 2026 wet-market ranges ---------- */
/**
 * Filipino wet-market species. basePrice is ₱/kg for a normal month, volatility is the
 * week-to-week swing (0..1), seasonality holds the wave's amplitude and its peak months.
 */
export const SPECIES = [
  { id: 'bangus', name: 'Milkfish', local: 'Bangus', emoji: '🐟', basePrice: 210, volatility: 0.055, seasonality: { amplitude: 0.07, peakMonths: [4, 5] } },
  { id: 'tilapia', name: 'Tilapia', local: 'Tilapia', emoji: '🐠', basePrice: 135, volatility: 0.05, seasonality: { amplitude: 0.05, peakMonths: [5, 6] } },
  { id: 'galunggong', name: 'Round scad', local: 'Galunggong', emoji: '🐟', basePrice: 180, volatility: 0.09, seasonality: { amplitude: 0.09, peakMonths: [12, 1] } },
  { id: 'tamban', name: 'Herring', local: 'Tamban', emoji: '🐟', basePrice: 95, volatility: 0.1, seasonality: { amplitude: 0.1, peakMonths: [11, 12] } },
  { id: 'lapulapu', name: 'Grouper', local: 'Lapu-lapu', emoji: '🐡', basePrice: 420, volatility: 0.07, seasonality: { amplitude: 0.06, peakMonths: [12, 4] } },
  { id: 'hipon', name: 'Shrimp', local: 'Hipon', emoji: '🦐', basePrice: 380, volatility: 0.115, seasonality: { amplitude: 0.08, peakMonths: [8, 9] } },
  { id: 'alimasag', name: 'Blue crab', local: 'Alimasag', emoji: '🦀', basePrice: 320, volatility: 0.1, seasonality: { amplitude: 0.07, peakMonths: [10, 11] } },
  { id: 'pusit', name: 'Squid', local: 'Pusit', emoji: '🦑', basePrice: 290, volatility: 0.095, seasonality: { amplitude: 0.08, peakMonths: [3, 4] } },
  { id: 'tahong', name: 'Green mussel', local: 'Tahong', emoji: '🦪', basePrice: 110, volatility: 0.065, seasonality: { amplitude: 0.06, peakMonths: [1, 2] } },
]

const byId = new Map(SPECIES.map((s) => [s.id, s]))

function findSpecies(id) {
  const sp = byId.get(id)
  if (!sp) throw new Error(`Unknown species '${id}'. Known: ${[...byId.keys()].join(', ')}`)
  return sp
}

/* ---------- price model: exactly one price per (species, day) ---------- */

/** Seasonal wave: cosine peaking at the species' first peak month. */
function seasonWave(sp, idx) {
  const peak = (sp.seasonality.peakMonths[0] ?? 1) - 1
  return Math.cos((2 * Math.PI * (dayOfYear(idx) - peak * 30.4 - 15)) / 365) * sp.seasonality.amplitude
}

/** Typhoon-season squeeze: dry months carry a small discount, Jun–Nov pay a premium. */
function supplyStress(sp, idx) {
  const base = MONTH_TYPHOON[monthOf(idx)] ?? 0
  const storm = base ? 0.55 + ((noise(sp.id, isoOf(idx), 'storm') + 1) / 2) * 0.9 : 1
  return (base - TYPHOON_BASE) * storm * (1 + sp.volatility * 2)
}

/** Diesel / transport drift: slow deterministic wobble, ±2.5%. */
const fuelCost = (idx) => noise('fuel', `${yearOf(idx)}-${monthOf(idx) + 1}`, 'diesel') * 0.025

/** Fiesta, holiday, Holy Week and weekend demand lift, centred on zero. */
function demandLift(idx) {
  const weekend = [0, 1, 2].includes(dowOf(idx)) ? 0.007 : -0.003
  return MONTH_DEMAND[monthOf(idx)] - DEMAND_BASE + holyWeekLift(idx) * 0.05 + weekend
}

/** Price for one species on one day, plus the factors that produced it. */
function priceAt(sp, idx) {
  const factors = {
    season: seasonWave(sp, idx),
    supply: supplyStress(sp, idx),
    fuel: fuelCost(idx),
    demand: demandLift(idx),
    jitter: noise(sp.id, isoOf(idx), 'px') * sp.volatility,
  }
  const total = 1 + factors.season + factors.supply + factors.fuel + factors.demand + factors.jitter
  return { price: Math.max(peso(sp.basePrice * total), peso(sp.basePrice * 0.55)), factors }
}

/* ---------- recommendation: derived from deltaPct + volatility only ---------- */

function recommend(sp, deltaPct, days) {
  const vol = sp.volatility
  const thr = oneDp(1 + vol * 40) // choppier fish need a bigger move before any call
  const move = `${signed(deltaPct)}% over ${days} day${days === 1 ? '' : 's'}`
  const volTxt = `${Math.round(vol * 100)}% volatility`
  const name = sp.local.toLowerCase()
  const px = peso(sp.basePrice)

  if (deltaPct <= -thr) {
    return { verdict: 'sell-now', headline: 'Sell now — the market is softening',
      detail: `Prices are sliding ${move}. With ${volTxt} on ${name}, waiting risks a deeper cut — move stock while the ₱${px}/kg floor still holds.` }
  }
  if (deltaPct >= thr && vol <= 0.1) {
    return { verdict: 'hold', headline: 'Hold — prices are climbing',
      detail: `Prices are up ${move} on low ${volTxt}. Holding cold stock another two to three days should clear above ₱${px}/kg.` }
  }
  if (deltaPct >= thr) {
    return { verdict: 'sell', headline: 'Sell — rising, but too choppy to gamble',
      detail: `Prices are up ${move}, yet ${name} swings ${volTxt} week to week. Bank today's gain instead of holding for a peak that may not come.` }
  }
  if (vol > 0.095) {
    return { verdict: 'sell', headline: 'Sell — thin spread, unsettled supply',
      detail: `Only ${move}, and ${name} landings are erratic at ${volTxt}. Take today's price rather than carrying the risk.` }
  }
  return { verdict: 'hold', headline: 'Hold — market is steady',
    detail: `Only ${move} and calm ${volTxt}. No urgency either way — hold, and re-check tomorrow's landing volume.` }
}

/** Four weighted drivers behind today's price, with plain-language notes. */
function buildDrivers(sp, idx) {
  const f = priceAt(sp, idx).factors
  const mon = MONTHS[monthOf(idx)]
  const beat = MONTH_DEMAND[monthOf(idx)] - DEMAND_BASE // this month vs a normal month
  const rows = [
    { label: 'Season', impact: dir(f.season, 0.005), weight: Math.abs(f.season),
      note: f.season >= 0 ? `${sp.local} is in its lean-landing stretch — ${mon} supply stays tight.`
        : `${sp.local} landings are peaking in ${mon}, which caps the price.` },
    { label: 'Supply & weather', impact: dir(f.supply), weight: Math.abs(f.supply),
      note: f.supply > 0.004 ? 'Typhoon-season seas are cutting boat trips — fewer kilos per landing.'
        : f.supply < -0.004 ? 'Calm dry-season seas, so landings are ample and there is no weather premium.'
          : 'Seas are average for the month: no weather premium, no glut.' },
    { label: 'Fuel & transport', impact: dir(f.fuel), weight: Math.abs(f.fuel),
      note: f.fuel >= 0 ? 'Diesel is drifting up, adding to hauling cost from the pier.'
        : 'Softer diesel prices are trimming transport cost into the market.' },
    { label: 'Demand (fiestas & holidays)', impact: dir(f.demand, 0.02), weight: Math.abs(f.demand),
      note: holyWeekLift(idx) > 0.2 ? 'Semana Santa week — the year\u2019s heaviest buying for family reunions.'
        : `${mon} demand is ${beat > 0.02 ? 'elevated by the holiday season' : beat < -0.02 ? 'in its post-holiday lull' : 'close to baseline'} in Metro Manila markets.` },
  ]
  const sum = rows.reduce((a, r) => a + r.weight, 0) || 1
  return rows.map(({ weight, ...r }) => ({ ...r, weight: Math.round((weight / sum) * 100) / 100 }))
}

/* ---------- public API ---------- */

/**
 * Price forecast for one species: 14 days of history, `days` of forecast with a confidence
 * band that widens with horizon, and a derived sell/hold call.
 *
 * @param {string} speciesId  species id, e.g. 'galunggong'
 * @param {{days?: number, today?: string}} [opts]  days 1–30 (default 7); today is 'YYYY-MM-DD'
 * @returns {{species: object, today: string, history: Array<{date:string,price:number}>,
 *   forecast: Array<{date:string,price:number,low:number,high:number}>, deltaPct: number, confidence: number,
 *   recommendation: {verdict:'hold'|'sell'|'sell-now',headline:string,detail:string},
 *   drivers: Array<{label:string,impact:'up'|'down'|'flat',weight:number,note:string}>}}
 */
export function getForecast(speciesId, opts = {}) {
  const sp = findSpecies(speciesId)
  const days = clamp(Math.round(opts.days ?? 7), 1, 30)
  const todayIdx = parseIndex(opts.today ?? DEFAULT_TODAY)

  const history = []
  for (let i = 14; i >= 1; i--) history.push({ date: isoOf(todayIdx - i), price: priceAt(sp, todayIdx - i).price })

  const forecast = []
  for (let k = 0; k < days; k++) {
    const idx = todayIdx + k
    const { price } = priceAt(sp, idx)
    const spread = price * (0.018 + sp.volatility * 0.7) * Math.sqrt(k + 1)
    forecast.push({ date: isoOf(idx), price, low: peso(price - spread), high: peso(price + spread) })
  }

  const lastHistory = history[history.length - 1].price
  const deltaPct = oneDp(((forecast[forecast.length - 1].price - lastHistory) / lastHistory) * 100)
  const confidence = Math.round(clamp(94 - sp.volatility * 160 - (days - 7) * 0.8, 35, 95))

  return { species: sp, today: isoOf(todayIdx), history, forecast, deltaPct, confidence,
    recommendation: recommend(sp, deltaPct, days), drivers: buildDrivers(sp, todayIdx) }
}

/**
 * Market-wide 7-day snapshot: basket average plus the three biggest risers and fallers.
 * @param {string} [today]  ISO 'YYYY-MM-DD' reference date
 */
export function getMarketSummary(today = DEFAULT_TODAY) {
  const rows = SPECIES
    .map((sp) => {
      const { deltaPct } = getForecast(sp.id, { today, days: 7 })
      return { id: sp.id, name: sp.name, local: sp.local, deltaPct }
    })
    .sort((a, b) => b.deltaPct - a.deltaPct)

  const avgDeltaPct = oneDp(rows.reduce((a, r) => a + r.deltaPct, 0) / rows.length)
  const risers = rows.slice(0, 3)
  const fallers = rows.slice(-3).reverse()

  return { avgDeltaPct, risers, fallers,
    note: `Basket is ${avgDeltaPct >= 0 ? 'up' : 'down'} ${signed(avgDeltaPct)}% over the next 7 days. `
      + `${risers[0].local} leads at ${signed(risers[0].deltaPct)}%; ${fallers[0].local} is softest at ${signed(fallers[0].deltaPct)}%.` }
}

/**
 * Buying-pressure score per weekday for the week starting `today`; weekends and
 * fiesta/holiday season score higher.
 * @param {string} [today]  ISO 'YYYY-MM-DD' reference date
 * @returns {Array<{day:'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun', score:number}>} exactly 7 entries
 */
export function getDemandHeat(today = DEFAULT_TODAY) {
  const start = parseIndex(today)
  return Array.from({ length: 7 }, (_, k) => {
    const idx = start + k
    const dow = dowOf(idx)
    const weekend = dow === 0 || dow === 6 ? 18 : dow === 5 ? 10 : 0
    const palengke = dow === 6 ? 6 : 0 // Saturday is the big market day
    const score = Math.round(46 + weekend + palengke + MONTH_DEMAND[monthOf(idx)] * 190
      + holyWeekLift(idx) * 130 + noise('market', isoOf(idx), 'heat') * 4)
    return { day: WEEKDAYS[dow], score: clamp(score, 5, 100) }
  })
}
